// POST  /api/groups/[id]/invites  -> generates a 6-char join code for the
//                                    group. Multi-use (maxUses=50, 14-day
//                                    expiry). Response: { code, expiresAt }.
// GET   /api/groups/[id]/invites  -> list pending code invites (member-readable)
//
// The old link-based token is still minted (for backward-compat with any
// currently-outstanding links) but the UI no longer surfaces it.
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, randomUUID } from 'crypto'
import { p } from '@/lib/prisma'
import { AuthError, requireGroupAdmin, requireGroupMember } from '@/lib/authz'
import { generateCode } from '@/lib/invite-code'

export const runtime = 'nodejs'

const INVITE_TTL_DAYS = 14
const CODE_COLLISION_RETRIES = 5

/** Generate a unique code, retrying on the (very unlikely) collision. */
async function uniqueCode(): Promise<string> {
  for (let i = 0; i < CODE_COLLISION_RETRIES; i++) {
    const c = generateCode()
    const hit = await p.invite.findUnique({ where: { code: c }, select: { id: true } })
    if (!hit) return c
  }
  throw new Error('could not allocate a unique join code')
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  let userId: string
  try {
    const g = await requireGroupAdmin(groupId); userId = g.userId
  } catch (e) {
    const err = e as AuthError
    return NextResponse.json({ error: err.message }, { status: err.status ?? 401 })
  }

  const token = randomBytes(18).toString('base64url')
  const code = await uniqueCode()
  const invite = await p.invite.create({
    data: {
      id: randomUUID(),
      groupId,
      token,
      code,
      createdById: userId,
      maxUses: 50,
      usedCount: 0,
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  })

  return NextResponse.json({
    id: invite.id,
    code,
    expiresAt: invite.expiresAt,
    maxUses: invite.maxUses,
    usedCount: invite.usedCount,
  })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  try { await requireGroupMember(groupId) } catch (e) {
    const err = e as AuthError
    return NextResponse.json({ error: err.message }, { status: err.status ?? 401 })
  }
  const invites = await p.invite.findMany({
    where: {
      groupId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
      code: { not: null },
    },
    select: {
      id: true, code: true, maxUses: true, usedCount: true,
      createdAt: true, expiresAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(invites)
}
