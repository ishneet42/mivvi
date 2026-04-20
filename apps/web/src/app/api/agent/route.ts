// Mivvi: streaming assignment-agent endpoint — Gemini edition.
// POST { receiptId, groupId, message, history? } -> plain-text stream.
//
// Same 9 tools, same preferences grounding, same no-op guardrail. Vendor is
// now Gemini 2.5 Flash (function calling via @google/genai).
import { NextRequest } from 'next/server'
import { GoogleGenAI, type Content, type FunctionCall } from '@google/genai'
import { ASSIGNER_SYSTEM_CURRENT } from '@/lib/agent/prompts'
import { geminiTools, STATE_CHANGING_TOOLS } from '@/lib/agent/gemini-tools'
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
const MODEL = process.env.GEMINI_AGENT_MODEL ?? 'gemini-2.5-flash'

function looksLikeSpecificCommand(msg: string): boolean {
  const s = msg.toLowerCase()
  if (/\b(got|had|ate|drank|took|pays?|paid|pay for|splits?|assign(ed)?|share[ds]?|own(ed)?|covers?)\b/.test(s)) return true
  if (/between\s+\w+\s+(and|,)\s+\w+/.test(s)) return true
  return false
}

const NUDGE_MESSAGE =
  "Your previous turn did not change any assignments. If the command was specific " +
  "(you named people and items or categories), execute the assignments now via " +
  "assign_item tool calls — do not ask further. If the command was genuinely " +
  "ambiguous, ask exactly ONE short clarifying question instead."

type WireHistory = Array<{ role: 'user' | 'model'; content: string }>

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    receiptId?: string
    groupId?: string
    message?: string
    history?: WireHistory
  }
  const { receiptId, groupId, message, history = [] } = body
  if (!receiptId || !groupId || !message) {
    return new Response('receiptId, groupId, message required', { status: 400 })
  }

  try {
    const auth = await requireReceiptOwner(receiptId)
    if (auth.groupId !== groupId) return new Response('groupId mismatch', { status: 400 })
  } catch (e) {
    const err = e as AuthError
    return new Response(err.message, { status: err.status ?? 401 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return new Response('GEMINI_API_KEY not set', { status: 500 })

  // Preference injection (identical to the OpenAI version).
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

  const systemInstruction = prefsSummary
    ? `${ASSIGNER_SYSTEM_CURRENT}

## Participant preferences (per-item exclusions)

${prefsSummary}

### How to apply preferences

For EACH item in the receipt, ask: "does this item's name match a keyword in any excluded person's tag list?"
- If YES for person X: exclude X from THAT item only.
- If NO: X is included in that item's split like anyone else.

### Exclusion category keywords

${preferencesPromptVocabulary()}

Match keywords case-insensitively; partial word match is OK.`
    : ASSIGNER_SYSTEM_CURRENT

  // Translate chat history to Gemini's role conventions ("user" | "model").
  const contents: Content[] = history
    .filter((h) => h.role === 'user' || h.role === 'model')
    .map((h) => ({ role: h.role, parts: [{ text: h.content }] }))
  contents.push({ role: 'user', parts: [{ text: message }] })

  const ai = new GoogleGenAI({ apiKey })

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

          const response = await ai.models.generateContentStream({
            model: MODEL,
            contents,
            config: {
              systemInstruction,
              tools: [{ functionDeclarations: geminiTools }],
              temperature: 0.2,
            },
          })

          let assistantText = ''
          const roundFunctionCalls: FunctionCall[] = []

          for await (const chunk of response) {
            if (chunk.usageMetadata) {
              totalInputTokens = chunk.usageMetadata.promptTokenCount ?? totalInputTokens
              totalOutputTokens = chunk.usageMetadata.candidatesTokenCount ?? totalOutputTokens
            }
            const parts = chunk.candidates?.[0]?.content?.parts ?? []
            for (const part of parts) {
              if (part.text) {
                assistantText += part.text
                send(part.text)
              }
              if (part.functionCall) {
                roundFunctionCalls.push(part.functionCall)
              }
            }
          }

          if (roundFunctionCalls.length === 0) {
            if (!retriedOnNoOp && stateChanges === 0 && specificCommand) {
              retriedOnNoOp = true
              if (assistantText) {
                contents.push({ role: 'model', parts: [{ text: assistantText }] })
              }
              contents.push({ role: 'user', parts: [{ text: NUDGE_MESSAGE }] })
              continue
            }
            break
          }

          contents.push({
            role: 'model',
            parts: [
              ...(assistantText ? [{ text: assistantText }] : []),
              ...roundFunctionCalls.map((fc) => ({ functionCall: fc })),
            ],
          })

          const toolResponseParts: any[] = []
          for (const fc of roundFunctionCalls) {
            const name = fc.name ?? ''
            toolCallNames.push(name)
            if (STATE_CHANGING_TOOLS.has(name)) stateChanges++
            const args = (fc.args ?? {}) as Record<string, unknown>
            const result = await executeTool(name, args, { receiptId, groupId })
            toolResponseParts.push({
              functionResponse: {
                name,
                response: result as Record<string, unknown>,
              },
            })
          }
          contents.push({ role: 'user', parts: toolResponseParts })
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
