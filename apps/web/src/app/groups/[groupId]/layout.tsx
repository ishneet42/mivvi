import { cached } from '@/app/cached-functions'
import { requireUser } from '@/lib/authz'
import { p } from '@/lib/prisma'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PropsWithChildren } from 'react'
import { GroupLayoutClient } from './layout.client'

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
  // Multi-user gate: any member of the group can view it.
  const member = await p.groupMember.findUnique({
    where: { groupId_clerkUserId: { groupId, clerkUserId: userId } },
    select: { role: true },
  })
  if (!member) notFound()
  return <GroupLayoutClient groupId={groupId}>{children}</GroupLayoutClient>
}
