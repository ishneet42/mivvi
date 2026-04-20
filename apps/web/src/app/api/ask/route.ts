// Mivvi: RAG balance-assistant endpoint. Streaming answer + citations.
// POST { question }  ->  plain-text stream of assistant text, terminated
// with a "\n\n__META__{json}" line so the client can render citation chips.
//
// Uses Gemini (gemini-2.5-flash) for generation and gemini-embedding-001 for
// retrieval — matches the rest of the Mivvi stack post vendor-swap.
import { NextRequest } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { retrieveForUser } from '@/lib/rag/retrieve'
import { BALANCE_SYSTEM_V1 } from '@/lib/agent/prompts'
import { AuthError, requireUser } from '@/lib/authz'
import { costFor, logLlmCall } from '@/lib/telemetry'

export const runtime = 'nodejs'

const MODEL = process.env.GEMINI_ASK_MODEL ?? 'gemini-2.5-flash'

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

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return new Response('GEMINI_API_KEY not set', { status: 500 })

  const encoder = new TextEncoder()

  let retrieved: Awaited<ReturnType<typeof retrieveForUser>>
  try {
    retrieved = await retrieveForUser(userId, q)
  } catch (e) {
    // Most common cause: embedding dim mismatch (pre-vendor-swap vectors) or
    // GEMINI_API_KEY missing. Surface it as a streamed error instead of 500
    // so the UI shows something.
    const msg = e instanceof Error ? e.message : String(e)
    return new Response(new ReadableStream({
      start(c) {
        c.enqueue(encoder.encode(
          `Couldn't search expenses: ${msg}. ` +
          'If you just swapped embedding models, rebuild the index on /ask.',
        ))
        c.enqueue(encoder.encode(`\n\n__META__${JSON.stringify({ retrieved: [] })}`))
        c.close()
      },
    }), { headers: { 'content-type': 'text/plain; charset=utf-8' } })
  }

  if (retrieved.length === 0) {
    return new Response(new ReadableStream({
      start(c) {
        c.enqueue(encoder.encode(
          "I don't know from the records I can see. You don't have any expenses yet, " +
          "or they haven't been indexed yet — try the Rebuild index button on /ask.",
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

  const prompt =
    `Here are the retrieved expenses (JSON):\n\n${JSON.stringify(context, null, 2)}\n\n` +
    `Question: ${q}`

  const client = new GoogleGenAI({ apiKey })
  const t0 = Date.now()
  let inTokens = 0, outTokens = 0

  const stream = new ReadableStream({
    async start(controller) {
      const send = (s: string) => controller.enqueue(encoder.encode(s))
      try {
        const resp = await client.models.generateContentStream({
          model: MODEL,
          contents: prompt,
          config: {
            systemInstruction: BALANCE_SYSTEM_V1,
            temperature: 0.2,
          },
        })
        for await (const chunk of resp) {
          const text = chunk.text
          if (text) send(text)
          const usage = chunk.usageMetadata
          if (usage) {
            inTokens = usage.promptTokenCount ?? inTokens
            outTokens = usage.candidatesTokenCount ?? outTokens
          }
        }
        send(`\n\n__META__${JSON.stringify({ retrieved })}`)
      } catch (e) {
        send(`\n[error: ${e instanceof Error ? e.message : String(e)}]`)
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
