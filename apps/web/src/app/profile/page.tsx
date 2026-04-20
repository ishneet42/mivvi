import { currentUser } from '@clerk/nextjs/server'
import { randomUUID } from 'crypto'
import { p } from '@/lib/prisma'
import { requireUser } from '@/lib/authz'
import { validatePreferences } from '@/lib/preferences'
import { ProfileClient } from './profile-client'

export default async function ProfilePage() {
  const userId = await requireUser()
  let prof = await p.userProfile.findUnique({ where: { clerkUserId: userId } })
  if (!prof) {
    prof = await p.userProfile.create({
      data: { id: randomUUID(), clerkUserId: userId },
    })
  }
  const user = await currentUser().catch(() => null)
  return (
    <ProfileClient
      initialUsername={prof.username ?? ''}
      initialDisplayName={prof.displayName ?? ''}
      initialAvatarPreset={prof.avatarPreset}
      initialAvatarEmoji={prof.avatarEmoji}
      initialPreferences={validatePreferences(prof.preferences)}
      initialVoice={prof.voiceName}
      clerkImageUrl={user?.imageUrl ?? null}
      clerkFirstName={user?.firstName ?? null}
      clerkEmail={user?.primaryEmailAddress?.emailAddress ?? null}
    />
  )
}
