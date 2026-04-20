// Mivvi: enter a 6-char join code to be added to a group. Mirrors Discord's
// "Join a Server" modal — type the code, pick which participant you are,
// done. Works as a deep-link too: /join?c=ABC-X7K prefills the input.
import { Suspense } from 'react'
import { JoinClient } from './join-client'

export const metadata = { title: 'Join a group' }

export default function JoinPage() {
  return (
    <Suspense>
      <JoinClient />
    </Suspense>
  )
}
