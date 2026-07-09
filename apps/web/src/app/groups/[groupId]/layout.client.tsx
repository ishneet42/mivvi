'use client'

import { useToast } from '@/components/ui/use-toast'
import { trpc } from '@/trpc/client'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { PropsWithChildren, useEffect } from 'react'
import { ScanFab } from '@/components/scan-fab'
import { CurrentGroupProvider } from './current-group-context'
import { GroupHeader } from './group-header'
import { SaveGroupLocally } from './save-recent-group'

export function GroupLayoutClient({
  groupId,
  children,
}: PropsWithChildren<{ groupId: string }>) {
  const { data, isLoading, error } = trpc.groups.get.useQuery(
    { groupId },
    // FORBIDDEN/NOT_FOUND won't heal on retry — fail fast to the
    // not-a-member screen instead of spinning through 3 retries.
    { retry: false },
  )
  const t = useTranslations('Groups.NotFound')
  const { toast } = useToast()

  useEffect(() => {
    if (data && !data.group) {
      toast({
        description: t('text'),
        variant: 'destructive',
      })
    }
  }, [data])

  // Not a member (or signed into a different account than the one that
  // joined). Old share links pointed straight at /groups/<id>/expenses,
  // which is membership-gated — without this branch the visitor was stuck
  // on a loading skeleton with a raw FORBIDDEN error. Give them a real
  // explanation and a path in (the /join page).
  if (error?.data?.code === 'FORBIDDEN') {
    return (
      <main className="max-w-md mx-auto px-6 py-20 text-center">
        <div className="font-display text-3xl text-ink mb-3">
          Invite needed
        </div>
        <p className="text-sm text-ink-soft mb-2">
          You&apos;re signed in, but you&apos;re not a member of this group
          yet — group pages are private to members.
        </p>
        <p className="text-sm text-ink-soft mb-8">
          Ask whoever shared this for an <strong>invite link</strong> (it
          looks like <span className="font-mono text-xs">/join?c=ABC123</span>)
          or a 6-character join code.
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

  const props =
    isLoading || !data?.group
      ? { isLoading: true as const, groupId, group: undefined }
      : { isLoading: false as const, groupId, group: data.group }

  if (isLoading) {
    return (
      <CurrentGroupProvider {...props}>
        <GroupHeader />
        {children}
      </CurrentGroupProvider>
    )
  }

  return (
    <CurrentGroupProvider {...props}>
      <GroupHeader />
      {children}
      <ScanFab groupId={groupId} />
      <SaveGroupLocally />
    </CurrentGroupProvider>
  )
}
