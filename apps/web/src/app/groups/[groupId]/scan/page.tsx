// Mivvi: full-screen receipt scanner (Dribbble-inspired UI).
import { notFound } from 'next/navigation'
import { p } from '@/lib/prisma'
import { requireUser } from '@/lib/authz'
import { DEFAULT_VOICE } from '@/lib/voices'
import { ScanClient } from './scan-client'

export default async function ScanPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  const userId = await requireUser()
  const group = await p.group.findUnique({ where: { id: groupId } })
  if (!group) notFound()
  // Pull the user's selected voice so the Live session can speak in it.
  const prof = await p.userProfile.findUnique({
    where: { clerkUserId: userId },
    select: { voiceName: true },
  })
  return (
    <ScanClient
      groupId={group.id}
      groupName={group.name}
      currency={group.currency}
      voice={prof?.voiceName ?? DEFAULT_VOICE}
      geminiEnabled={
        !!process.env.GEMINI_API_KEY || !!process.env.NEXT_PUBLIC_GEMINI_API_KEY
      }
    />
  )
}
