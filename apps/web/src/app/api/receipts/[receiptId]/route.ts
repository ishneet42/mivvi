// GET   /api/receipts/[id]  ->  receipt + items + assignments. Owner-only.
// PATCH /api/receipts/[id]  ->  rename: { title?: string | null }
import { NextRequest, NextResponse } from 'next/server'
import { p } from '@/lib/prisma'
import { loadReceipt } from '@/lib/snapsplit/core'
import { AuthError, requireReceiptOwner } from '@/lib/authz'

export const runtime = 'nodejs'

const MAX_TITLE_LEN = 80

export async function GET(_req: NextRequest, { params }: { params: Promise<{ receiptId: string }> }) {
  const { receiptId } = await params
  try {
    await requireReceiptOwner(receiptId)
  } catch (e) {
    const err = e as AuthError
    return NextResponse.json({ error: err.message }, { status: err.status ?? 401 })
  }
  const r = await loadReceipt(receiptId)
  return NextResponse.json({
    receiptId: r.id,
    groupId: r.groupId,
    title: r.title,
    taxCents: r.taxCents,
    tipCents: r.tipCents,
    items: r.items.map((it) => ({
      id: it.id,
      name: it.name,
      qty: it.qty,
      unitPrice: it.unitPrice,
      lineTotal: it.lineTotal,
      parsedConfidence: it.parsedConfidence,
      assignedTo: it.assignments.map((a) => a.participantId),
    })),
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ receiptId: string }> }) {
  const { receiptId } = await params
  try {
    await requireReceiptOwner(receiptId)
  } catch (e) {
    const err = e as AuthError
    return NextResponse.json({ error: err.message }, { status: err.status ?? 401 })
  }
  const body = (await req.json().catch(() => ({}))) as { title?: string | null }
  let title: string | null
  if (body.title === null || body.title === undefined) {
    title = null  // explicit clear → fall back to merchant in UI
  } else if (typeof body.title === 'string') {
    const trimmed = body.title.trim()
    if (!trimmed) { title = null }
    else if (trimmed.length > MAX_TITLE_LEN) {
      return NextResponse.json(
        { error: `title too long (max ${MAX_TITLE_LEN} chars)` }, { status: 400 })
    }
    else { title = trimmed }
  } else {
    return NextResponse.json({ error: 'title must be a string' }, { status: 400 })
  }
  const updated = await p.receipt.update({
    where: { id: receiptId },
    data: { title },
    select: { id: true, title: true },
  })
  return NextResponse.json({ receiptId: updated.id, title: updated.title })
}
