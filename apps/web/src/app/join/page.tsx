// Mivvi: enter a 6-char join code to be added to a group.
//
// Server-side auth gate so unauthenticated friends who tap a shared join
// link get bounced through Clerk sign-up and land back on this page with
// the code preserved — instead of seeing a confusing "code lookup failed:
// HTTP 401" error from the client-side fetch.
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { JoinClient } from './join-client'

export const metadata = { title: 'Join a group' }

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>
}) {
  const { userId } = await auth()
  const { c } = await searchParams

  if (!userId) {
    // Bounce through sign-up, preserving the code so we land back here
    // with ?c=ABC-X7K still attached and can resume the join.
    const back = c ? `/join?c=${encodeURIComponent(c)}` : '/join'
    redirect(`/sign-up?redirect_url=${encodeURIComponent(back)}`)
  }

  return (
    <Suspense>
      <JoinClient />
    </Suspense>
  )
}
