// POST { groupId, payerId }  ->  writes a real Expense, returns ids. Owner-only.
import { NextRequest, NextResponse } from 'next/server'
import { finalizeReceipt } from '@/lib/snapsplit/core'
import { AuthError, requireReceiptOwner } from '@/lib/authz'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ receiptId: string }> }) {
  const { receiptId } = await params
  let groupId: string
  try {
    ({ groupId } = await requireReceiptOwner(receiptId))
  } catch (e) {
    const err = e as AuthError
    return NextResponse.json({ error: err.message }, { status: err.status ?? 401 })
  }
  const body = (await req.json()) as { groupId?: string; payerId?: string }
  if (body.groupId && body.groupId !== groupId) {
    return NextResponse.json({ error: 'groupId mismatch' }, { status: 400 })
  }
  const result = await finalizeReceipt(receiptId, groupId, body.payerId)
  const status = result.ok ? 200 : 400
  return NextResponse.json(result, { status })
}
