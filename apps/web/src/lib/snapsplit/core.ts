// Mivvi: shared helpers used by both the chat agent tools and the REST
// endpoints. Keep ledger-writing code here so tap-UI and agent-UI stay in sync.
//
// Tax + tip: we persist what the parser extracted, and pro-rate both across
// assignees proportionally to their subtotal share on finalize. The agent can
// override tip via `set_tip`.
import { randomUUID } from 'crypto'
import { p } from '@/lib/prisma'
import { embedExpense } from '@/lib/rag/embed'

export type ParsedItem = {
  name: string
  qty: number
  unit_price: number
  line_total: number
  parsed_confidence: number
}
export type ParsedReceipt = {
  merchant: string | null
  date: string | null
  currency: string
  items: ParsedItem[]
  subtotal: number | null
  tax: number | null
  tip: number | null
  total: number | null
  confidence: number
}

const toCents = (x: number | null | undefined) =>
  x == null ? null : Math.round(x * 100)

export async function createReceiptFromParsed(groupId: string, parsed: ParsedReceipt) {
  const receiptId = randomUUID()
  const itemRows = parsed.items.map((it) => ({
    id: randomUUID(),
    receiptId,
    name: it.name,
    qty: it.qty,
    unitPrice: toCents(it.unit_price) ?? 0,
    lineTotal: toCents(it.line_total) ?? 0,
    parsedConfidence: it.parsed_confidence,
  }))
  await p.receipt.create({
    data: {
      id: receiptId,
      groupId,
      rawJson: JSON.stringify(parsed),
      parserVersion: 'gpt-4o-v1',
      confidence: parsed.confidence,
      taxCents: toCents(parsed.tax),
      tipCents: toCents(parsed.tip),
      items: { create: itemRows.map(({ receiptId: _r, ...rest }) => rest) },
    },
  })
  return { receiptId, items: itemRows }
}

export async function loadReceipt(receiptId: string) {
  return p.receipt.findUniqueOrThrow({
    where: { id: receiptId },
    include: { items: { include: { assignments: true } } },
  })
}

export async function setAssignments(itemId: string, participantIds: string[], weights?: number[]) {
  await p.assignment.deleteMany({ where: { itemId } })
  if (participantIds.length === 0) return { itemId, count: 0 }
  await p.assignment.createMany({
    data: participantIds.map((pid, i) => ({
      id: randomUUID(),
      itemId,
      participantId: pid,
      weight: weights?.[i] ?? 1,
    })),
    skipDuplicates: true,
  })
  return { itemId, count: participantIds.length }
}

export async function splitRemainingEvenly(receiptId: string, groupId: string, personIds?: string[]) {
  const r = await loadReceipt(receiptId)
  let people = personIds ?? []
  if (people.length === 0) {
    const ps = await p.participant.findMany({ where: { groupId } })
    people = ps.map((pp) => pp.id)
  }
  let touched = 0
  for (const it of r.items) {
    if (it.assignments.length > 0) continue
    await setAssignments(it.id, people)
    touched++
  }
  return { items_assigned: touched }
}

/**
 * Per-person totals in cents, computed as:
 *   subtotal  = sum of (item.lineTotal * weight / sum(weights)) over assigned items
 *   share of tax/tip = person.subtotal / total_subtotal * (tax|tip)
 *
 * If nobody is assigned at all, tax/tip fall on nobody (the receipt can't be
 * finalized). If the receipt has no tax/tip recorded, those fields are 0.
 */
export async function getSummary(receiptId: string) {
  const r = await loadReceipt(receiptId)

  const subtotals: Record<string, number> = {}
  for (const it of r.items) {
    if (it.assignments.length === 0) continue
    const totalWeight = it.assignments.reduce((s, a) => s + a.weight, 0) || 1
    for (const a of it.assignments) {
      subtotals[a.participantId] = (subtotals[a.participantId] ?? 0) + (it.lineTotal * a.weight) / totalWeight
    }
  }
  const totalSubtotal = Object.values(subtotals).reduce((s, v) => s + v, 0)
  const tax = r.taxCents ?? 0
  const tip = r.tipCents ?? 0

  return Object.entries(subtotals).map(([pid, sub]) => {
    const share = totalSubtotal > 0 ? sub / totalSubtotal : 0
    return {
      person_id: pid,
      subtotal_cents: Math.round(sub),
      tax_cents: Math.round(tax * share),
      tip_cents: Math.round(tip * share),
      total_cents: Math.round(sub + tax * share + tip * share),
    }
  })
}

export async function setTip(receiptId: string, amount?: number, percent?: number) {
  if (amount == null && percent == null) return { ok: false as const, error: 'provide amount or percent' }
  const r = await loadReceipt(receiptId)
  let cents = 0
  if (amount != null) {
    cents = Math.round(amount * 100)
  } else if (percent != null) {
    const subtotal = r.items.reduce((s, it) => s + it.lineTotal, 0)
    cents = Math.round((subtotal * percent) / 100)
  }
  await p.receipt.update({ where: { id: receiptId }, data: { tipCents: cents } })
  return { ok: true as const, tip_cents: cents }
}

export async function finalizeReceipt(receiptId: string, groupId: string, payerId?: string) {
  const r = await loadReceipt(receiptId)
  const summary = await getSummary(receiptId)
  if (summary.length === 0) return { ok: false as const, error: 'no assignments yet' }

  let payer = payerId
  if (!payer) {
    const people = await p.participant.findMany({ where: { groupId } })
    if (people.length === 0) return { ok: false as const, error: 'no group members' }
    payer = people[0].id
  }

  // Validate payer is in the group.
  const payerOk = await p.participant.findFirst({ where: { id: payer, groupId }, select: { id: true } })
  if (!payerOk) return { ok: false as const, error: 'payer not in group' }

  const totalCents = summary.reduce((s, x) => s + x.total_cents, 0)
  const expenseId = randomUUID()
  await p.expense.create({
    data: {
      id: expenseId,
      groupId,
      // User-chosen title wins (set on the scan sheet or via the
       // rename_receipt tool). Otherwise fall back to a dated label.
      title: r.title?.trim() || `Receipt @ ${new Date(r.createdAt).toLocaleDateString()}`,
      amount: totalCents,
      paidById: payer,
      splitMode: 'BY_AMOUNT',
      paidFor: {
        create: summary.map((s) => ({ participantId: s.person_id, shares: s.total_cents })),
      },
    },
  })
  await p.receipt.update({ where: { id: r.id }, data: { finalizedAt: new Date() } })
  // RAG index: best-effort embed the new expense.
  void embedExpense(expenseId)
  return { ok: true as const, expense_id: expenseId, total_cents: totalCents }
}
