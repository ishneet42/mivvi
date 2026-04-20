// POST { itemId, participantIds, weights? }  ->  replace assignments for an item (owner-only)
// GET                                         ->  per-person summary for this receipt (owner-only)
import { NextRequest, NextResponse } from 'next/server'
import { getSummary, setAssignments } from '@/lib/snapsplit/core'
import { AuthError, requireReceiptOwner } from '@/lib/authz'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ receiptId: string }> }) {
  const { receiptId } = await params
  try {
    await requireReceiptOwner(receiptId)
  } catch (e) {
    const err = e as AuthError
    return NextResponse.json({ error: err.message }, { status: err.status ?? 401 })
  }

  const body = (await req.json()) as { itemId?: string; participantIds?: string[]; weights?: number[] }
  if (!body.itemId || !Array.isArray(body.participantIds)) {
    return NextResponse.json({ error: 'itemId + participantIds required' }, { status: 400 })
  }
  const r = await setAssignments(body.itemId, body.participantIds, body.weights)
  return NextResponse.json(r)
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ receiptId: string }> }) {
  const { receiptId } = await params
  try {
    await requireReceiptOwner(receiptId)
  } catch (e) {
    const err = e as AuthError
    return NextResponse.json({ error: err.message }, { status: err.status ?? 401 })
  }
  return NextResponse.json(await getSummary(receiptId))
}
