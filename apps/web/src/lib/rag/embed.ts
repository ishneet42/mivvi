// Mivvi RAG: embedding helpers for the balance assistant.
// Uses OpenAI's text-embedding-3-small (1536 dims) for both indexing
// expenses and embedding user questions.
import { p } from '@/lib/prisma'
import { costFor, logLlmCall } from '@/lib/telemetry'

const EMBED_MODEL = 'text-embedding-3-small'
const EMBED_URL = 'https://api.openai.com/v1/embeddings'

export async function embed(text: string): Promise<number[]> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY not set')
  const t0 = Date.now()
  const res = await fetch(EMBED_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  })
  if (!res.ok) throw new Error(`embed failed: ${res.status} ${await res.text()}`)
  const j = (await res.json()) as { data: { embedding: number[] }[]; usage?: { prompt_tokens: number } }
  const inTok = j.usage?.prompt_tokens ?? 0
  void logLlmCall({
    ts: t0 / 1000, route: 'embed', model: EMBED_MODEL, ok: true,
    ms: Date.now() - t0, input_tokens: inTok, output_tokens: 0,
    cost_usd: costFor(EMBED_MODEL, inTok, 0),
  })
  return j.data[0].embedding
}

/** Build the textual representation we embed for an expense. Tuned for
 *  natural-language queries like "what did we spend on coffee last month?"
 *  — we include merchant-ish title, date, amount, category, and participants.
 */
export async function expenseToText(expenseId: string): Promise<string | null> {
  const e = await p.expense.findUnique({
    where: { id: expenseId },
    include: {
      paidBy: { select: { name: true } },
      paidFor: { include: { participant: { select: { name: true } } } },
      category: { select: { name: true } },
    },
  })
  if (!e) return null
  const amount = (e.amount / 100).toFixed(2)
  const date = e.expenseDate.toISOString().slice(0, 10)
  const cat = e.category?.name ? ` [${e.category.name}]` : ''
  const paidFor = e.paidFor.map((pf) => pf.participant.name).join(', ')
  return `${e.title}${cat} on ${date} — $${amount} paid by ${e.paidBy.name}, for: ${paidFor || 'none'}`
}

/** Compute + write an embedding for an existing expense. No-op on failure. */
export async function embedExpense(expenseId: string): Promise<boolean> {
  try {
    const text = await expenseToText(expenseId)
    if (!text) return false
    const vec = await embed(text)
    // pgvector literal: '[0.1,0.2,...]'
    const lit = `[${vec.join(',')}]`
    await p.$executeRawUnsafe(
      `UPDATE "Expense" SET "embedding" = $1::vector WHERE id = $2`,
      lit, expenseId,
    )
    return true
  } catch (err) {
    console.warn(`[embed] expense ${expenseId} failed:`, err)
    return false
  }
}
