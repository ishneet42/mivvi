// POST /api/invites/code/[code]/accept { participantId?, newParticipantName? }
//
// Multi-use: increments usedCount instead of setting acceptedAt.
// If the body has neither participantId nor newParticipantName, we
// auto-resolve the joiner using their Clerk display name:
//   1. Exact (case-insensitive) match against an unclaimed participant, OR
//   2. Create a new participant with that name.
// Already-a-member is idempotent success.
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { p } from '@/lib/prisma'
import { AuthError, requireUser } from '@/lib/authz'
import { normalizeCode } from '@/lib/invite-code'
import { resolveUserDisplayName } from '@/lib/user-display-name'

export const runtime = 'nodejs'

function normalizeForMatch(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  let userId: string
  try { userId = await requireUser() } catch (e) {
    const err = e as AuthError
    return NextResponse.json({ error: err.message }, { status: err.status ?? 401 })
  }
  const { code: rawCode } = await params
  const code = normalizeCode(rawCode)
  if (!code) return NextResponse.json({ error: 'invalid code format' }, { status: 400 })

  const body = (await req.json().catch(() => ({}))) as {
    participantId?: string
    newParticipantName?: string
  }

  const invite = await p.invite.findUnique({
    where: { code },
    include: { group: true },
  })
  if (!invite) return NextResponse.json({ error: 'code not found' }, { status: 404 })
  if (invite.revokedAt || invite.expiresAt < new Date() || invite.usedCount >= invite.maxUses) {
    return NextResponse.json({ error: 'code unusable' }, { status: 410 })
  }

  // Already a member? Idempotent success.
  const existing = await p.groupMember.findUnique({
    where: { groupId_clerkUserId: { groupId: invite.groupId, clerkUserId: userId } },
  })
  if (existing) {
    return NextResponse.json({ ok: true, groupId: invite.groupId, alreadyMember: true })
  }

  // Resolve the Participant row this user IS.
  let participantId: string | null = null
  if (body.participantId) {
    const part = await p.participant.findUnique({ where: { id: body.participantId } })
    if (!part || part.groupId !== invite.groupId) {
      return NextResponse.json({ error: 'invalid participant' }, { status: 400 })
    }
    if (part.clerkUserId && part.clerkUserId !== userId) {
      return NextResponse.json({ error: 'participant already claimed by someone else' }, { status: 409 })
    }
    participantId = part.id
  } else {
    // No explicit pick. Use the signed-in user's Clerk/profile display name
    // to try an auto-match first, else create a new participant.
    const explicitName = body.newParticipantName?.trim()
    const name = explicitName || (await resolveUserDisplayName(userId))
    const key = normalizeForMatch(name)

    const unclaimed = await p.participant.findMany({
      where: { groupId: invite.groupId, clerkUserId: null },
      select: { id: true, name: true },
    })
    const match = unclaimed.find((pp) => normalizeForMatch(pp.name) === key)
    if (match) {
      participantId = match.id
    } else {
      const created = await p.participant.create({
        data: {
          id: randomUUID(),
          groupId: invite.groupId,
          name: name || 'Member',
          clerkUserId: userId,
        },
      })
      participantId = created.id
    }
  }

  await p.$transaction(async (tx) => {
    if (participantId) {
      await tx.participant.update({
        where: { id: participantId },
        data: { clerkUserId: userId },
      })
    }
    await tx.groupMember.create({
      data: {
        id: randomUUID(),
        groupId: invite.groupId,
        clerkUserId: userId,
        role: 'MEMBER',
        participantId,
      },
    })
    await tx.invite.update({
      where: { id: invite.id },
      data: { usedCount: { increment: 1 } },
    })
  })

  return NextResponse.json({ ok: true, groupId: invite.groupId })
}
