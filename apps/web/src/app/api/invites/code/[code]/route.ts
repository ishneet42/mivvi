// GET /api/invites/code/[code]  ->  validate + return group name + unclaimed
//                                   participants so the /join page can render
//                                   the participant picker.
import { NextRequest, NextResponse } from 'next/server'
import { p } from '@/lib/prisma'
import { AuthError, requireUser } from '@/lib/authz'
import { normalizeCode } from '@/lib/invite-code'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try { await requireUser() } catch (e) {
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

  return NextResponse.json({
    groupId: invite.groupId,
    groupName: invite.group.name,
    participants: invite.group.participants,
    remainingUses: invite.maxUses - invite.usedCount,
  })
}
