// Mivvi: snap a receipt, tap to assign, finalize into a spliit Expense.
import { notFound } from 'next/navigation'
import { p } from '@/lib/prisma'
import { SnapClient } from './snap-client'

export default async function SnapPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  const group = await p.group.findUnique({
    where: { id: groupId },
    include: { participants: true },
  })
  if (!group) notFound()

  return (
    <SnapClient
      groupId={group.id}
      groupName={group.name}
      currency={group.currency}
      participants={group.participants.map((pp) => ({ id: pp.id, name: pp.name }))}
    />
  )
}
