// Mivvi: snap a receipt, tap to assign, finalize into a spliit Expense.
import { notFound } from 'next/navigation'
import { p } from '@/lib/prisma'
import { requireUser } from '@/lib/authz'
import { DEFAULT_VOICE } from '@/lib/voices'
import { SnapClient } from './snap-client'

export default async function SnapPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  const userId = await requireUser()
  const [group, prof] = await Promise.all([
    p.group.findUnique({
      where: { id: groupId },
      include: { participants: true },
    }),
    p.userProfile.findUnique({
      where: { clerkUserId: userId },
      select: { voiceName: true },
    }),
  ])
  if (!group) notFound()
  const me = group.participants.find((pp) => pp.clerkUserId === userId)

  return (
    <SnapClient
      groupId={group.id}
      groupName={group.name}
      currency={group.currency}
      participants={group.participants.map((pp) => ({ id: pp.id, name: pp.name }))}
      voice={prof?.voiceName ?? DEFAULT_VOICE}
      currentUserName={me?.name ?? ''}
      geminiEnabled={
        !!process.env.GEMINI_API_KEY || !!process.env.NEXT_PUBLIC_GEMINI_API_KEY
      }
    />
  )
}
