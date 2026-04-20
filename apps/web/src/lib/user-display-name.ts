// Mivvi: resolve a sensible display name for the signed-in user, used when
// auto-claiming a participant slot on group join. Priority mirrors the
// rest of the app (profile.displayName > clerk.firstName > profile.username
// > email prefix > "You").
import { currentUser } from '@clerk/nextjs/server'
import { p } from '@/lib/prisma'

export async function resolveUserDisplayName(userId: string): Promise<string> {
  const [profile, clerk] = await Promise.all([
    p.userProfile.findUnique({
      where: { clerkUserId: userId },
      select: { displayName: true, username: true },
    }),
    currentUser().catch(() => null),
  ])
  return (
    profile?.displayName ||
    clerk?.firstName ||
    profile?.username ||
    clerk?.primaryEmailAddress?.emailAddress?.split('@')[0] ||
    'You'
  )
}
