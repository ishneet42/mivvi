import { cached } from '@/app/cached-functions'
import { requireUser } from '@/lib/authz'
import { p } from '@/lib/prisma'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PropsWithChildren } from 'react'
import { GroupLayoutClient } from './layout.client'
import { NotAMember } from './not-a-member'

type Props = {
  params: Promise<{
    groupId: string
  }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { groupId } = await params
  const group = await cached.getGroup(groupId)

  return {
    title: {
      default: group?.name ?? '',
      template: `%s · ${group?.name} · Mivvi`,
    },
  }
}

export default async function GroupLayout({
  children,
  params,
}: PropsWithChildren<Props>) {
  const { groupId } = await params
  const userId = await requireUser()
  const group = await cached.getGroup(groupId)
  if (!group) notFound()
  // Multi-user gate: any member of the group can view it. Non-members
  // get an explicit "you need an invite" screen — NOT notFound(): the
  // group does exist, and people commonly land here via a shared
  // /groups/<id> link, so point them at the join flow instead.
  const member = await p.groupMember.findUnique({
    where: { groupId_clerkUserId: { groupId, clerkUserId: userId } },
    select: { role: true },
  })
  if (!member) return <NotAMember groupName={group.name} />
  return <GroupLayoutClient groupId={groupId}>{children}</GroupLayoutClient>
}
