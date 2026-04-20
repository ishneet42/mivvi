// POST /api/invites/[token]/accept { participantId?, newParticipantName? }
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { p } from '@/lib/prisma'
import { AuthError, requireUser } from '@/lib/authz'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  let userId: string
  try { userId = await requireUser() } catch (e) {
    const err = e as AuthError
    return NextResponse.json({ error: err.message }, { status: err.status ?? 401 })
  }
  const { token } = await params
  const body = (await req.json().catch(() => ({}))) as {
    participantId?: string
    newParticipantName?: string
  }

  const invite = await p.invite.findUnique({
    where: { token },
    include: { group: true },
  })
  if (!invite) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (invite.revokedAt || invite.acceptedAt || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'invite unusable' }, { status: 410 })
  }

  // Already a member? Treat as success; don't duplicate.
  const existing = await p.groupMember.findUnique({
    where: { groupId_clerkUserId: { groupId: invite.groupId, clerkUserId: userId } },
  })
  if (existing) {
    return NextResponse.json({ ok: true, groupId: invite.groupId, alreadyMember: true })
  }

  // Resolve which Participant this user IS.
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
  } else if (body.newParticipantName?.trim()) {
    const created = await p.participant.create({
      data: {
        id: randomUUID(),
        groupId: invite.groupId,
        name: body.newParticipantName.trim(),
        clerkUserId: userId,
      },
    })
    participantId = created.id
  } else {
    return NextResponse.json({ error: 'pick a participant or provide a name' }, { status: 400 })
  }

  // Stamp participant → user link, and create the membership.
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
      data: { acceptedAt: new Date(), acceptedBy: userId },
    })
  })

  return NextResponse.json({ ok: true, groupId: invite.groupId })
}
