// Mivvi: RAG balance-assistant endpoint. Streaming answer + citations.
// POST { question }  ->  SSE-ish stream of assistant text
// Response body is plain-text chunks followed by a trailing metadata JSON line
// prefixed with "\n\n__META__" so the client can render citation chips.
import { NextRequest } from 'next/server'
import { retrieveForUser } from '@/lib/rag/retrieve'
import { BALANCE_SYSTEM_V1 } from '@/lib/agent/prompts'
import { AuthError, requireUser } from '@/lib/authz'
import { costFor, logLlmCall } from '@/lib/telemetry'

export const runtime = 'nodejs'

const MODEL = 'gpt-4o-mini'
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

export async function POST(req: NextRequest) {
  let userId: string
  try {
    userId = await requireUser()
  } catch (e) {
    const err = e as AuthError
    return new Response(err.message, { status: err.status ?? 401 })
  }

  const body = (await req.json()) as { question?: string }
  const q = body.question?.trim()
  if (!q) return new Response('question required', { status: 400 })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return new Response('OPENAI_API_KEY not set', { status: 500 })

  const retrieved = await retrieveForUser(userId, q)
  if (retrieved.length === 0) {
    const encoder = new TextEncoder()
    return new Response(new ReadableStream({
      start(c) {
        c.enqueue(encoder.encode(
          "I don't know from the records I can see. You don't have any expenses yet, " +
          'or they haven\'t been indexed yet — try the Backfill button on /ask.',
        ))
        c.enqueue(encoder.encode(`\n\n__META__${JSON.stringify({ retrieved: [] })}`))
        c.close()
      },
    }), { headers: { 'content-type': 'text/plain; charset=utf-8' } })
  }

  const context = retrieved.map((r) => ({
    id: r.id,
    title: r.title,
    amount_cents: r.amount_cents,
    date: r.expenseDate,
    group: r.groupName,
    paid_by: r.paidByName,
    paid_for: r.paidFor,
  }))

  const messages = [
    { role: 'system', content: BALANCE_SYSTEM_V1 },
    {
      role: 'user',
      content:
        `Here are the retrieved expenses (JSON):\n\n${JSON.stringify(context, null, 2)}\n\n` +
        `Question: ${q}`,
    },
  ]

  const encoder = new TextEncoder()
  const t0 = Date.now()
  let inTokens = 0, outTokens = 0
  const stream = new ReadableStream({
    async start(controller) {
      const send = (s: string) => controller.enqueue(encoder.encode(s))
      try {
        const res = await fetch(OPENAI_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: MODEL, messages, stream: true, temperature: 0.2,
            stream_options: { include_usage: true },
          }),
        })
        if (!res.ok || !res.body) {
          send(`\n[error: ${res.status} ${await res.text()}]`)
          controller.close()
          return
        }
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
                inTokens += j.usage.prompt_tokens ?? 0
                outTokens += j.usage.completion_tokens ?? 0
              }
              const delta = j.choices?.[0]?.delta
              if (delta?.content) send(delta.content)
            } catch { /* keepalive */ }
          }
        }
        // Trailing metadata so the client can render citation chips.
        send(`\n\n__META__${JSON.stringify({ retrieved })}`)
      } catch (e) {
        send(`\n[fatal: ${e instanceof Error ? e.message : String(e)}]`)
      } finally {
        const ms = Date.now() - t0
        const cost = costFor(MODEL, inTokens, outTokens)
        void logLlmCall({
          ts: t0 / 1000, route: '/api/ask', model: MODEL, ok: true,
          ms, input_tokens: inTokens, output_tokens: outTokens, cost_usd: cost,
        })
        controller.close()
      }
    },
  })

  return new Response(stream, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
}
