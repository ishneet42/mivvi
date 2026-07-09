import Link from 'next/link'

// Shown when a signed-in visitor opens a group they're not a member of —
// classically by following a raw /groups/<id>/... link someone shared
// (the pre-fix Share button produced exactly those). Telling them the
// group "does not exist" was misleading; membership is what's missing,
// and /join is the path in.
export function NotAMember({ groupName }: { groupName?: string }) {
  return (
    <main className="max-w-md mx-auto px-6 py-20 text-center">
      <div className="font-display text-3xl text-ink mb-3">Invite needed</div>
      <p className="text-sm text-ink-soft mb-2">
        You&apos;re signed in, but you&apos;re not a member of
        {groupName ? (
          <>
            {' '}
            <strong>{groupName}</strong>
          </>
        ) : (
          ' this group'
        )}{' '}
        yet — group pages are private to members.
      </p>
      <p className="text-sm text-ink-soft mb-8">
        Ask whoever shared this for an <strong>invite link</strong> (it looks
        like <span className="font-mono text-xs">/join?c=ABC123</span>) or a
        6-character join code.
      </p>
      <div className="flex flex-col items-center gap-3">
        <Link
          href="/join"
          className="h-11 px-6 rounded-full bg-ink text-paper-cream text-sm font-medium flex items-center justify-center"
        >
          I have a join code
        </Link>
        <Link href="/groups" className="text-sm underline opacity-80">
          Back to my groups
        </Link>
      </div>
    </main>
  )
}
