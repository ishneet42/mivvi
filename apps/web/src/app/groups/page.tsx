import { RecentGroupList } from '@/app/groups/recent-group-list'
import { requireUser } from '@/lib/authz'
import { p } from '@/lib/prisma'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Your groups',
}

export default async function GroupsPage() {
  // First-run gate lives HERE, not on the sign-in redirect: repeat sign-ins
  // land on /groups directly (no onboarding flash — users complained they
  // were re-asked "what should your friends call you" on every sign-in),
  // while anyone who abandoned onboarding still gets caught the first time
  // they open their groups. /onboarding itself skips forward when a
  // displayName already exists.
  const userId = await requireUser()
  const profile = await p.userProfile.findUnique({
    where: { clerkUserId: userId },
    select: { displayName: true },
  })
  if (!profile?.displayName?.trim()) redirect('/onboarding?next=/groups')

  return <RecentGroupList />
}
