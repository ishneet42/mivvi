// GET /api/receipts/[id]  ->  receipt + items + assignments. Owner-only.
import { NextRequest, NextResponse } from 'next/server'
import { loadReceipt } from '@/lib/snapsplit/core'
import { AuthError, requireReceiptOwner } from '@/lib/authz'

export const runtime = 'nodejs'

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
