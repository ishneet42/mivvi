// Mivvi RAG: embedding helpers for the balance assistant.
//
// Uses Gemini's gemini-embedding-001 with outputDimensionality=1536 so the
// vectors line up with the existing pgvector column (vector(1536), originally
// sized for OpenAI text-embedding-3-small). Switching models requires a
// re-index: the /ask page has a "Rebuild index" button wired to
// /api/ask/backfill for exactly this case.
import { GoogleGenAI } from '@google/genai'
import { p } from '@/lib/prisma'
import { costFor, logLlmCall } from '@/lib/telemetry'

const EMBED_MODEL = 'gemini-embedding-001'
const EMBED_DIMS = 1536

export async function embed(text: string): Promise<number[]> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY not set')
  const t0 = Date.now()
  const client = new GoogleGenAI({ apiKey: key })
  const res = await client.models.embedContent({
    model: EMBED_MODEL,
    contents: text,
    config: { outputDimensionality: EMBED_DIMS },
  })
  const vec = res.embeddings?.[0]?.values
  if (!vec || vec.length !== EMBED_DIMS) {
    throw new Error(`embed failed: got ${vec?.length ?? 0} dims, expected ${EMBED_DIMS}`)
  }
  // Gemini doesn't surface token counts on embeddings; approximate for logging
  // only (4 chars/token). Cost is tracked per-char in Google's pricing docs.
  const approxTokens = Math.ceil(text.length / 4)
  void logLlmCall({
    ts: t0 / 1000, route: 'embed', model: EMBED_MODEL, ok: true,
    ms: Date.now() - t0, input_tokens: approxTokens, output_tokens: 0,
    cost_usd: costFor(EMBED_MODEL, approxTokens, 0),
  })
  return vec
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
