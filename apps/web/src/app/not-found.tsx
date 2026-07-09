import Link from 'next/link'

// Root 404 — without this, Next serves its default white error page,
// which reads as a broken site against the kraft-paper app shell.
export default function NotFound() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
      <div
        className="font-display text-2xl text-redpen border-[3px] border-redpen rounded-md px-4 py-1.5 rotate-[-13deg] opacity-80 mb-8"
        aria-hidden="true"
      >
        404
      </div>
      <h1 className="font-display text-3xl sm:text-4xl text-ink mb-3">
        Page not found
      </h1>
      <p className="text-sm text-ink-soft mb-8 max-w-xs">
        This page isn&apos;t on the receipt. Check the link, or head back to
        your groups.
      </p>
      <Link
        href="/groups"
        className="h-11 px-6 rounded-full bg-ink text-paper-cream text-sm font-medium flex items-center justify-center"
      >
        Back to my groups
      </Link>
    </main>
  )
}
