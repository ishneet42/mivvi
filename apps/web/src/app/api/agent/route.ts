// Mivvi: streaming assignment-agent endpoint. Owner-only.
// POST { receiptId, groupId, message, history? } -> SSE stream of assistant text.
//
// No-op guardrail: the N=20 eval (V2 prompt) showed that ~13% of specific-command
// turns ended without any state-changing tool call — the agent looked up
// items/people and stopped narrating. We detect that condition and inject a
// one-shot nudge message to prompt an action, avoiding silent failures.
import { NextRequest } from 'next/server'
import { ASSIGNER_SYSTEM_CURRENT } from '@/lib/agent/prompts'
import { tools } from '@/lib/agent/tools'
import { executeTool } from '@/lib/agent/impl'
import { AuthError, requireReceiptOwner } from '@/lib/authz'
import { p as prisma } from '@/lib/prisma'
import { costFor, logLlmCall } from '@/lib/telemetry'
import {
  formatParticipantPreferences,
  preferencesPromptVocabulary,
  validatePreferences,
} from '@/lib/preferences'

export const runtime = 'nodejs'

const MAX_ROUNDS = 8
const MODEL = 'gpt-4o-mini'
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

const STATE_CHANGING_TOOLS = new Set([
  'assign_item', 'unassign_item', 'split_remaining_evenly',
  'mark_person_absent', 'set_tip', 'finalize',
])

// Heuristic: does the user's message look like a specific command (names +
// items / verbs) as opposed to a vague prompt ("split it" / "what do I owe?").
// False positives are OK — an unnecessary nudge costs one extra turn.
function looksLikeSpecificCommand(msg: string): boolean {
  const s = msg.toLowerCase()
  if (/\b(got|had|ate|drank|took|pays?|paid|pay for|splits?|assign(ed)?|share[ds]?|own(ed)?|covers?)\b/.test(s)) return true
  if (/between\s+\w+\s+(and|,)\s+\w+/.test(s)) return true
  if (/\b(ishi|manny|kai|priya|leo|sam)\b/.test(s)) return false // names alone not enough
  return false
}

const NUDGE_MESSAGE =
  "Your previous turn did not change any assignments. If the command was specific " +
  "(you named people and items or categories), execute the assignments now via " +
  "assign_item tool calls — do not ask further. If the command was genuinely " +
  "ambiguous, ask exactly ONE short clarifying question instead."

type Msg =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: any[] }
  | { role: 'tool'; tool_call_id: string; content: string }

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    receiptId?: string
    groupId?: string
    message?: string
    history?: Msg[]
  }
  const { receiptId, groupId, message, history = [] } = body
  if (!receiptId || !groupId || !message) {
    return new Response('receiptId, groupId, message required', { status: 400 })
  }

  // Ownership check: the authenticated user must own the receipt's group.
  try {
    const auth = await requireReceiptOwner(receiptId)
    if (auth.groupId !== groupId) {
      return new Response('groupId mismatch', { status: 400 })
    }
  } catch (e) {
    const err = e as AuthError
    return new Response(err.message, { status: err.status ?? 401 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return new Response('OPENAI_API_KEY not set', { status: 500 })

  // ── Effective preferences per participant ──────────────────────
  // Claimed participants inherit from their linked UserProfile. Unclaimed
  // participants use any Participant.preferences the group owner set.
  const participants = await prisma.participant.findMany({
    where: { groupId },
    select: { name: true, clerkUserId: true, preferences: true },
  })
  const claimedUserIds = participants
    .map((pp) => pp.clerkUserId)
    .filter((x): x is string => !!x)
  const profiles = claimedUserIds.length
    ? await prisma.userProfile.findMany({
        where: { clerkUserId: { in: claimedUserIds } },
        select: { clerkUserId: true, preferences: true },
      })
    : []
  const prefByClerk = new Map(
    profiles.map((pr) => [pr.clerkUserId, validatePreferences(pr.preferences)]),
  )
  const effectivePrefs = participants.map((pp) => ({
    name: pp.name,
    preferences:
      pp.clerkUserId && prefByClerk.has(pp.clerkUserId)
        ? prefByClerk.get(pp.clerkUserId) ?? []
        : validatePreferences(pp.preferences),
  }))
  const prefsSummary = formatParticipantPreferences(effectivePrefs)

  // Extend the system prompt only when someone actually has preferences set —
  // saves tokens for groups that don't use the feature.
  const systemPrompt = prefsSummary
    ? `${ASSIGNER_SYSTEM_CURRENT}

## Participant preferences (per-item exclusions)

People in this group have dietary / consumption preferences listed below. These are PER-ITEM exclusions — check each item individually.

${prefsSummary}

### How to apply preferences

For EACH item in the receipt, ask: "does this item's name match a keyword in any excluded person's tag list?"
- If YES for person X: exclude X from THAT item only.
- If NO: X is included in that item's split like anyone else.

Preferences do NOT remove a person from the group. They only remove them from items whose name matches one of their excluded keywords. Everything else they pay for normally.

### Worked example

Group: Ishi, Manny, Sarah (no_alcohol).
Receipt: Flatbread, Truffle Fries, Bottle of Cabernet, Pitcher of IPA.
User: "Split everything evenly."
Correct assignments:
- Flatbread → [Ishi, Manny, Sarah]            (food; Sarah's tag doesn't match)
- Truffle Fries → [Ishi, Manny, Sarah]         (food; Sarah's tag doesn't match)
- Bottle of Cabernet → [Ishi, Manny]           (wine matches no_alcohol; Sarah excluded)
- Pitcher of IPA → [Ishi, Manny]               (ipa matches no_alcohol; Sarah excluded)

Wrong (do NOT do this): excluding Sarah from all four items just because she has the no_alcohol tag.

### Exclusion category keywords

${preferencesPromptVocabulary()}

Match keywords case-insensitively; partial word match in the item name is OK ("Pitcher of IPA" → contains "ipa" → no_alcohol applies).

### Explicit overrides

If the user explicitly assigns someone to an item their tag would normally exclude ("John had the steak today", "include Manny in the wine this round"), respect the explicit command and assign them. Explicit command always wins over preference tag.`
    : ASSIGNER_SYSTEM_CURRENT

  const messages: Msg[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: message },
  ]

  const encoder = new TextEncoder()
  const t0 = Date.now()
  const toolCallNames: string[] = []
  let rounds = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let stateChanges = 0
  let retriedOnNoOp = false
  const specificCommand = looksLikeSpecificCommand(message)

  const stream = new ReadableStream({
    async start(controller) {
      const send = (s: string) => controller.enqueue(encoder.encode(s))
      try {
        for (let round = 0; round < MAX_ROUNDS; round++) {
          rounds = round + 1
          const res = await fetch(OPENAI_URL, {
            method: 'POST',
            headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: MODEL, messages, tools, stream: true,
              stream_options: { include_usage: true },
            }),
          })
          if (!res.ok || !res.body) {
            send(`\n[error: ${res.status} ${await res.text()}]`)
            break
          }

          let assistantText = ''
          const toolCalls: any[] = []
          const reader = res.body.getReader()
          const dec = new TextDecoder()
          let buf = ''
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            buf += dec.decode(value, { stream: true })
            const lines = buf.split('\n')
            buf = lines.pop() ?? ''
            for (const line of lines) {
              const t = line.trim()
              if (!t.startsWith('data:')) continue
              const data = t.slice(5).trim()
              if (data === '[DONE]') continue
              try {
                const j: any = JSON.parse(data)
                if (j.usage) {
                  totalInputTokens += j.usage.prompt_tokens ?? 0
                  totalOutputTokens += j.usage.completion_tokens ?? 0
                }
                const delta = j.choices?.[0]?.delta
                if (delta?.content) {
                  assistantText += delta.content
                  send(delta.content)
                }
                for (const tc of delta?.tool_calls ?? []) {
                  const i = tc.index
                  toolCalls[i] ??= { id: '', type: 'function', function: { name: '', arguments: '' } }
                  if (tc.id) toolCalls[i].id = tc.id
                  if (tc.function?.name) toolCalls[i].function.name = tc.function.name
                  if (tc.function?.arguments) toolCalls[i].function.arguments += tc.function.arguments
                }
              } catch { /* skip non-json keepalives */ }
            }
          }

          if (toolCalls.length === 0) {
            // No-op guardrail: if the user's message looked like a command but
            // we never changed state, inject one nudge and retry exactly once.
            if (!retriedOnNoOp && stateChanges === 0 && specificCommand) {
              retriedOnNoOp = true
              // Preserve the assistant's final content (if any) for transparency.
              if (assistantText) {
                messages.push({ role: 'assistant', content: assistantText })
              }
              messages.push({ role: 'user', content: NUDGE_MESSAGE })
              continue
            }
            break
          }

          messages.push({ role: 'assistant', content: assistantText || null, tool_calls: toolCalls })
          for (const call of toolCalls) {
            toolCallNames.push(call.function.name)
            if (STATE_CHANGING_TOOLS.has(call.function.name)) stateChanges++
            let args: Record<string, unknown> = {}
            try { args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown> } catch {}
            const result = await executeTool(call.function.name, args, { receiptId, groupId })
            messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) })
          }
        }
      } catch (e) {
        send(`\n[fatal: ${e instanceof Error ? e.message : String(e)}]`)
      } finally {
        const ms = Date.now() - t0
        const cost = costFor(MODEL, totalInputTokens, totalOutputTokens)
        send(`\n\n__AGENT_META__${JSON.stringify({
          rounds, tool_calls: toolCallNames, ms,
          input_tokens: totalInputTokens, output_tokens: totalOutputTokens, cost_usd: cost,
          state_changes: stateChanges, retried_on_no_op: retriedOnNoOp,
        })}`)
        void logLlmCall({
          ts: t0 / 1000,
          route: '/api/agent',
          model: MODEL,
          ok: true,
          ms,
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens,
          cost_usd: cost,
          tool_calls: toolCallNames.length,
          rounds,
        })
        controller.close()
      }
    },
  })

  return new Response(stream, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
}
