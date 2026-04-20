// Delete an eval group (cascades to participants, expenses, receipts, items).
import { NextRequest, NextResponse } from 'next/server'
import { p } from '@/lib/prisma'
import { AuthError, EVAL_USER_ID, requireUser } from '@/lib/authz'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let userId: string
  try { userId = await requireUser() } catch (e) {
    const err = e as AuthError
    return NextResponse.json({ error: err.message }, { status: err.status ?? 401 })
  }
  if (userId !== EVAL_USER_ID) {
    return NextResponse.json({ error: 'eval-only endpoint' }, { status: 403 })
  }
  const { groupId } = (await req.json()) as { groupId?: string }
  if (!groupId || !groupId.startsWith('eval_')) {
    return NextResponse.json({ error: 'eval group ids only' }, { status: 400 })
  }
  // Receipts cascade to items + assignments; Group cascades to participants
  // and expenses. So dropping the group is sufficient for cleanup.
  await p.receipt.deleteMany({ where: { groupId } })
  await p.group.delete({ where: { id: groupId } })
  return NextResponse.json({ ok: true })
}
