// First-run gate: ensures every signed-in user has a human-readable
// displayName before landing in the rest of the app. Prefills from Clerk's
// firstName / email-prefix so in the happy case it's one tap to continue.
//
// Bypasses silently if the user already has a displayName set (lets us point
// all post-auth redirects here without worrying about repeat prompts).
import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { p } from '@/lib/prisma'
import { requireUser } from '@/lib/authz'
import { OnboardingClient } from './onboarding-client'

export const metadata = { title: 'Welcome to Mivvi' }

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const safeNext = next && next.startsWith('/') ? next : '/groups'

  const userId = await requireUser()
  const [profile, clerk] = await Promise.all([
    p.userProfile.findUnique({
      where: { clerkUserId: userId },
      select: { displayName: true },
    }),
    currentUser().catch(() => null),
  ])

  // Already named → skip onboarding entirely.
  if (profile?.displayName?.trim()) redirect(safeNext)

  const suggested =
    clerk?.firstName?.trim() ||
    clerk?.primaryEmailAddress?.emailAddress?.split('@')[0] ||
    ''

  return <OnboardingClient suggested={suggested} nextHref={safeNext} />
}
