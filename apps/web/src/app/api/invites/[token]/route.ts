// GET  /api/invites/[token]       -> preview (group name, participant picklist)
// POST /api/invites/[token]/accept -> join as a member, optionally claim a participant
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { p } from '@/lib/prisma'
import { AuthError, requireUser } from '@/lib/authz'

export const runtime = 'nodejs'

async function loadInvite(token: string) {
  const i = await p.invite.findUnique({
    where: { token },
    include: { group: { include: { participants: true } } },
  })
  if (!i) return { error: 'invite not found' as const, status: 404 }
  if (i.revokedAt) return { error: 'invite revoked' as const, status: 410 }
  if (i.acceptedAt) return { error: 'invite already accepted' as const, status: 410 }
  if (i.expiresAt < new Date()) return { error: 'invite expired' as const, status: 410 }
  return { invite: i }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const r = await loadInvite(token)
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status })
  const { invite } = r
  return NextResponse.json({
    groupId: invite.groupId,
    groupName: invite.group.name,
    participants: invite.group.participants.map((pp) => ({
      id: pp.id, name: pp.name, claimed: !!pp.clerkUserId,
    })),
    pinnedParticipantId: invite.participantId,
  })
}
