// Mivvi: persist a parsed receipt into the DB for a group. Auth-gated.
// POST { groupId, parsed: Receipt }  ->  { receiptId, items: [...] }
import { NextRequest, NextResponse } from 'next/server'
import { createReceiptFromParsed, type ParsedReceipt } from '@/lib/snapsplit/core'
import { AuthError, requireGroupOwner } from '@/lib/authz'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { groupId?: string; parsed?: ParsedReceipt }
  if (!body.groupId || !body.parsed) {
    return NextResponse.json({ error: 'groupId and parsed required' }, { status: 400 })
  }
  try {
    await requireGroupOwner(body.groupId)
  } catch (e) {
    const err = e as AuthError
    return NextResponse.json({ error: err.message }, { status: err.status ?? 401 })
  }
  const result = await createReceiptFromParsed(body.groupId, body.parsed)
  return NextResponse.json(result)
}
