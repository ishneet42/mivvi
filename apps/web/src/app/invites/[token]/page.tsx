import { notFound } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { p } from '@/lib/prisma'
import { requireUser } from '@/lib/authz'
import { AcceptClient } from './accept-client'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const userId = await requireUser()
  const user = await currentUser()
  const myEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? null

  const invite = await p.invite.findUnique({
    where: { token },
    include: { group: { include: { participants: { orderBy: { name: 'asc' } } } } },
  })
  if (!invite) notFound()

  const invalid =
    invite.revokedAt != null ||
    invite.acceptedAt != null ||
    invite.expiresAt < new Date()

  return (
    <AcceptClient
      token={token}
      invalid={invalid}
      groupId={invite.groupId}
      groupName={invite.group.name}
      pinnedParticipantId={invite.participantId}
      myEmail={myEmail}
      participants={invite.group.participants.map((pp) => ({
        id: pp.id,
        name: pp.name,
        email: pp.email,
        claimed: !!pp.clerkUserId,
        isYou: pp.clerkUserId === userId,
        matchesYourEmail: !!(myEmail && pp.email && pp.email.toLowerCase() === myEmail),
      }))}
    />
  )
}
