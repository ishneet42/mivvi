import { CreateGroup } from '@/app/groups/create/create-group'
import { requireUser } from '@/lib/authz'
import { p } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Group',
}

export default async function CreateGroupPage() {
  // Pre-populate the participant list with the creator so new groups don't
  // start with the John/Jane/Jack placeholder names. The creator's
  // clerkUserId is stashed so they're auto-seeded as an OWNER GroupMember.
  const userId = await requireUser()
  const [profile, clerk] = await Promise.all([
    p.userProfile.findUnique({
      where: { clerkUserId: userId },
      select: { displayName: true, username: true },
    }),
    currentUser().catch(() => null),
  ])
  const creatorName =
    profile?.displayName ||
    clerk?.firstName ||
    profile?.username ||
    clerk?.primaryEmailAddress?.emailAddress?.split('@')[0] ||
    'You'
  return (
    <CreateGroup
      creator={{
        name: creatorName,
        clerkUserId: userId,
        email: clerk?.primaryEmailAddress?.emailAddress ?? undefined,
      }}
    />
  )
}
