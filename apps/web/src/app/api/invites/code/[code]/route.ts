// GET /api/invites/code/[code]  ->  validate + return group name + the
//                                   signed-in user's resolved display name
//                                   (so the UI can default to "Join as X"
//                                   without an extra picker step) +
//                                   unclaimed participants for the override
//                                   picker.
import { NextRequest, NextResponse } from 'next/server'
import { p } from '@/lib/prisma'
import { AuthError, requireUser } from '@/lib/authz'
import { normalizeCode } from '@/lib/invite-code'
import { resolveUserDisplayName } from '@/lib/user-display-name'

export const runtime = 'nodejs'

function normalizeForMatch(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  let userId: string
  try { userId = await requireUser() } catch (e) {
    const err = e as AuthError
    return NextResponse.json({ error: err.message }, { status: err.status ?? 401 })
  }
  const { code: rawCode } = await params
  const code = normalizeCode(rawCode)
  if (!code) return NextResponse.json({ error: 'invalid code format' }, { status: 400 })

  const invite = await p.invite.findUnique({
    where: { code },
    include: {
      group: {
        include: {
          participants: {
            where: { clerkUserId: null },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
          },
        },
      },
    },
  })
  if (!invite) return NextResponse.json({ error: 'code not found' }, { status: 404 })
  if (invite.revokedAt) {
    return NextResponse.json({ error: 'code revoked' }, { status: 410 })
  }
  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'code expired' }, { status: 410 })
  }
  if (invite.usedCount >= invite.maxUses) {
    return NextResponse.json({ error: 'code used up' }, { status: 410 })
  }

  const myName = await resolveUserDisplayName(userId)
  const myKey = normalizeForMatch(myName)
  const autoMatchParticipantId =
    invite.group.participants.find((pp) => normalizeForMatch(pp.name) === myKey)?.id ?? null

  return NextResponse.json({
    groupId: invite.groupId,
    groupName: invite.group.name,
    myName,
    autoMatchParticipantId,
    participants: invite.group.participants,
    remainingUses: invite.maxUses - invite.usedCount,
  })
}
