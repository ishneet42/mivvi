// Mivvi: multi-user authz.
// Semantics:
//   - MEMBER can read group data and add expenses / receipts.
//   - ADMIN + OWNER can invite, remove members, edit group settings.
//   - OWNER is a single special ADMIN who created the group and can't be removed.
//
// For automated evaluation, requests carrying X-Eval-Token: $MIVVI_EVAL_TOKEN
// are treated as signed in under the synthetic user id `eval:bot`, which is
// always seeded as OWNER of any group it creates.
import { auth } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import { p } from '@/lib/prisma'

export const EVAL_USER_ID = 'eval:bot'

export class AuthError extends Error {
  status: number
  constructor(msg: string, status = 401) {
    super(msg)
    this.status = status
  }
}

async function tryEvalBypass(): Promise<string | null> {
  const serverToken = process.env.MIVVI_EVAL_TOKEN
  if (!serverToken) return null
  const h = await headers()
  const client = h.get('x-eval-token')
  if (client && client === serverToken) return EVAL_USER_ID
  return null
}

export async function requireUser(): Promise<string> {
  const bypass = await tryEvalBypass()
  if (bypass) return bypass
  const { userId } = await auth()
  if (!userId) throw new AuthError('sign-in required', 401)
  return userId
}

export type GroupRole = 'OWNER' | 'ADMIN' | 'MEMBER'

export async function getMembership(groupId: string, userId: string): Promise<{ role: GroupRole } | null> {
  const m = await p.groupMember.findUnique({
    where: { groupId_clerkUserId: { groupId, clerkUserId: userId } },
    select: { role: true },
  })
  return m as { role: GroupRole } | null
}

export async function requireGroupMember(groupId: string): Promise<{ userId: string; role: GroupRole }> {
  const userId = await requireUser()
  const m = await getMembership(groupId, userId)
  if (!m) throw new AuthError('forbidden', 403)
  return { userId, role: m.role }
}

export async function requireGroupAdmin(groupId: string): Promise<{ userId: string; role: GroupRole }> {
  const { userId, role } = await requireGroupMember(groupId)
  if (role === 'MEMBER') throw new AuthError('admin role required', 403)
  return { userId, role }
}

export async function requireReceiptMember(receiptId: string): Promise<{ userId: string; groupId: string; role: GroupRole }> {
  const userId = await requireUser()
  const r = await p.receipt.findUnique({ where: { id: receiptId }, select: { groupId: true } })
  if (!r) throw new AuthError('receipt not found', 404)
  const m = await getMembership(r.groupId, userId)
  if (!m) throw new AuthError('forbidden', 403)
  return { userId, groupId: r.groupId, role: m.role }
}

// Back-compat aliases used by older route files; these now check membership
// (any role) rather than strict ownership.
export const requireGroupOwner = requireGroupMember
export const requireReceiptOwner = requireReceiptMember
