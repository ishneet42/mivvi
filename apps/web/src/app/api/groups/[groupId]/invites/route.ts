// POST  /api/groups/[id]/invites        -> { name?, email }. Creates/reuses a
//                                          participant, generates an invite
//                                          token, returns URL + mailto body.
// GET   /api/groups/[id]/invites        -> list pending invites (member-readable)
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, randomUUID } from 'crypto'
import { p } from '@/lib/prisma'
import { AuthError, requireGroupAdmin, requireGroupMember } from '@/lib/authz'

export const runtime = 'nodejs'

const INVITE_TTL_DAYS = 14

type CreateBody = {
  email?: string           // optional: for targeted email invites
  name?: string            // optional: pre-creates a participant if provided alongside email
  participantId?: string   // optional: explicit pre-assignment to an existing participant
  // If all three are absent, we generate a general-purpose shareable link
  // (no participant pinned, no email pre-filled).
}

function normalizeEmail(e: string): string {
  return e.trim().toLowerCase()
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  let userId: string
  try {
    const g = await requireGroupAdmin(groupId); userId = g.userId
  } catch (e) {
    const err = e as AuthError
    return NextResponse.json({ error: err.message }, { status: err.status ?? 401 })
  }

  const body = (await req.json().catch(() => ({}))) as CreateBody
  const rawEmail = body.email?.trim() ?? ''
  const email = rawEmail ? normalizeEmail(rawEmail) : null
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid email format' }, { status: 400 })
  }

  let participantId: string | null = body.participantId ?? null

  if (participantId) {
    // Explicit pre-assignment to a specific participant.
    const part = await p.participant.findUnique({ where: { id: participantId } })
    if (!part || part.groupId !== groupId) {
      return NextResponse.json({ error: 'invalid participant' }, { status: 400 })
    }
    if (part.clerkUserId) {
      return NextResponse.json({ error: 'participant already claimed' }, { status: 409 })
    }
    if (email && !part.email) {
      await p.participant.update({ where: { id: part.id }, data: { email } })
    }
  } else if (email) {
    // Email-based: find or create the participant this invite is targeting.
    const existing = await p.participant.findFirst({
      where: {
        groupId,
        OR: [
          { email },
          body.name ? { name: { equals: body.name, mode: 'insensitive' as const }, clerkUserId: null } : { id: '' },
        ],
      },
    })
    if (existing) {
      participantId = existing.id
      if (!existing.email) {
        await p.participant.update({ where: { id: existing.id }, data: { email } })
      }
    } else {
      const name = (body.name ?? email.split('@')[0]).trim() || 'Invited member'
      const created = await p.participant.create({
        data: { id: randomUUID(), groupId, name, email },
      })
      participantId = created.id
    }
  }
  // else: general-purpose invite. participantId stays null; the accept page
  // will let the invitee pick from unclaimed participants or create a new one.

  const token = randomBytes(18).toString('base64url')
  const invite = await p.invite.create({
    data: {
      id: randomUUID(),
      groupId,
      token,
      createdById: userId,
      email,
      participantId,
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  })

  return NextResponse.json({
    id: invite.id,
    token,
    email,
    participantId,
    kind: participantId ? 'targeted' : 'share',
    expiresAt: invite.expiresAt,
  })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  try { await requireGroupMember(groupId) } catch (e) {
    const err = e as AuthError
    return NextResponse.json({ error: err.message }, { status: err.status ?? 401 })
  }
  const invites = await p.invite.findMany({
    where: { groupId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, token: true, email: true, participantId: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(invites)
}
