'use client'
import { AddGroupByUrlButton } from '@/app/groups/add-group-by-url-button'
import {
  RecentGroups,
  getArchivedGroups,
  getRecentGroups,
  getStarredGroups,
} from '@/app/groups/recent-groups-helpers'
import { Button } from '@/components/ui/button'
import { getGroups } from '@/lib/api'
import { trpc } from '@/trpc/client'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { PropsWithChildren, useEffect, useState } from 'react'
import { RecentGroupListCard } from './recent-group-list-card'
import { ReceiptMark } from '@/components/receipt-mark'

export type RecentGroupsState =
  | { status: 'pending' }
  | {
      status: 'partial'
      groups: RecentGroups
      starredGroups: string[]
      archivedGroups: string[]
    }
  | {
      status: 'complete'
      groups: RecentGroups
      groupsDetails: Awaited<ReturnType<typeof getGroups>>
      starredGroups: string[]
      archivedGroups: string[]
    }

function sortGroups({
  groups,
  starredGroups,
  archivedGroups,
}: {
  groups: RecentGroups
  starredGroups: string[]
  archivedGroups: string[]
}) {
  const starredGroupInfo = []
  const groupInfo = []
  const archivedGroupInfo = []
  for (const group of groups) {
    if (starredGroups.includes(group.id)) {
      starredGroupInfo.push(group)
    } else if (archivedGroups.includes(group.id)) {
      archivedGroupInfo.push(group)
    } else {
      groupInfo.push(group)
    }
  }
  return {
    starredGroupInfo,
    groupInfo,
    archivedGroupInfo,
  }
}

export function RecentGroupList() {
  const [state, setState] = useState<RecentGroupsState>({ status: 'pending' })

  function loadGroups() {
    const groupsInStorage = getRecentGroups()
    const starredGroups = getStarredGroups()
    const archivedGroups = getArchivedGroups()
    setState({
      status: 'partial',
      groups: groupsInStorage,
      starredGroups,
      archivedGroups,
    })
  }

  useEffect(() => {
    loadGroups()
  }, [])

  if (state.status === 'pending') return null

  return (
    <RecentGroupList_
      groups={state.groups}
      starredGroups={state.starredGroups}
      archivedGroups={state.archivedGroups}
      refreshGroupsFromStorage={() => loadGroups()}
    />
  )
}

function RecentGroupList_({
  groups,
  starredGroups,
  archivedGroups,
  refreshGroupsFromStorage,
}: {
  groups: RecentGroups
  starredGroups: string[]
  archivedGroups: string[]
  refreshGroupsFromStorage: () => void
}) {
  const t = useTranslations('Groups')
  const { data, isLoading } = trpc.groups.list.useQuery({
    groupIds: groups.map((group) => group.id),
  })
  // Server-backed memberships. Without this, a group you were added to (by
  // username, or joined from another device) never appeared here until you
  // had opened its URL once — localStorage recents were the only source.
  const { data: mine, isLoading: mineLoading } = trpc.groups.listMine.useQuery()

  if (isLoading || mineLoading || !data || !mine) {
    return (
      <GroupsPage reload={refreshGroupsFromStorage}>
        <p className="font-mono text-sm text-label-soft">
          <Loader2 className="w-4 m-4 mr-2 inline animate-spin" />{' '}
          {t('loadingRecent')}
        </p>
      </GroupsPage>
    )
  }

  // Merge: local recents keep their visit order; memberships the device has
  // never visited are appended (newest first, per listMine). Local entries
  // with no server detail are dead (deleted group / no longer a member) and
  // are dropped instead of rendering skeleton cards forever.
  const detailById = new Map(
    [...data.groups, ...mine.groups].map((g) => [g.id, g]),
  )
  const mergedGroups = [
    ...groups.filter((g) => detailById.has(g.id)),
    ...mine.groups
      .filter((g) => !groups.some((lg) => lg.id === g.id))
      .map((g) => ({ id: g.id, name: g.name })),
  ]
  const mergedDetails = Array.from(detailById.values())

  if (mergedGroups.length === 0) {
    // First-run empty state — the Mivvi orb + two big CTAs. Much friendlier
    // than the old tiny link-style prompt, especially for a user who just
    // signed up and has no context about what to do next.
    return (
      <GroupsPage reload={refreshGroupsFromStorage}>
        <div className="flex flex-col items-center text-center py-12 px-6">
          <ReceiptMark size={110} className="mb-8" />
          <h2 className="font-display text-3xl text-ink mb-2">
            No groups yet
          </h2>
          <p className="text-sm text-ink-soft mb-8 max-w-xs">
            Create your first group to start splitting bills, or join one a friend shared with you.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <Button
              asChild
              className="flex-1 h-12 rounded-[10px] bg-ink font-mono font-bold uppercase tracking-[0.06em] text-[#F7F1E3] shadow-ticket hover:bg-ink-deep active:translate-y-0.5 active:shadow-ticket-press"
            >
              <Link href="/groups/create">Create a group</Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              className="flex-1 h-12 rounded-[10px] border-[1.5px] border-paper-dashed bg-transparent font-mono font-bold uppercase tracking-[0.06em] text-ink-soft hover:bg-paper-cream hover:text-ink"
            >
              <Link href="/join">Join with code</Link>
            </Button>
          </div>
        </div>
      </GroupsPage>
    )
  }

  const { starredGroupInfo, groupInfo, archivedGroupInfo } = sortGroups({
    groups: mergedGroups,
    starredGroups,
    archivedGroups,
  })

  return (
    <GroupsPage reload={refreshGroupsFromStorage}>
      {starredGroupInfo.length > 0 && (
        <>
          <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-label">
            {t('starred')}
          </h2>
          <GroupList
            groups={starredGroupInfo}
            groupDetails={mergedDetails}
            archivedGroups={archivedGroups}
            starredGroups={starredGroups}
            refreshGroupsFromStorage={refreshGroupsFromStorage}
          />
        </>
      )}

      {groupInfo.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-label">
            {t('recent')}
          </h2>
          <GroupList
            groups={groupInfo}
            groupDetails={mergedDetails}
            archivedGroups={archivedGroups}
            starredGroups={starredGroups}
            refreshGroupsFromStorage={refreshGroupsFromStorage}
          />
        </>
      )}

      {archivedGroupInfo.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-label opacity-70">
            {t('archived')}
          </h2>
          <div>
            <GroupList
              groups={archivedGroupInfo}
              groupDetails={mergedDetails}
              archivedGroups={archivedGroups}
              starredGroups={starredGroups}
              refreshGroupsFromStorage={refreshGroupsFromStorage}
            />
          </div>
        </>
      )}

      <Link
        href="/groups/create"
        className="mt-6 flex items-center justify-center rounded-[14px] border-2 border-dashed border-paper-dashed py-4 font-mono text-xs font-bold uppercase tracking-[0.16em] text-label-soft transition-colors hover:border-ink hover:text-ink"
      >
        ＋ {t('create')}
      </Link>
    </GroupsPage>
  )
}

function GroupList({
  groups,
  groupDetails,
  starredGroups,
  archivedGroups,
  refreshGroupsFromStorage,
}: {
  groups: RecentGroups
  groupDetails?: AppRouterOutput['groups']['list']['groups']
  starredGroups: string[]
  archivedGroups: string[]
  refreshGroupsFromStorage: () => void
}) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {groups.map((group) => (
        <RecentGroupListCard
          key={group.id}
          group={group}
          groupDetail={groupDetails?.find(
            (groupDetail) => groupDetail.id === group.id,
          )}
          isStarred={starredGroups.includes(group.id)}
          isArchived={archivedGroups.includes(group.id)}
          refreshGroupsFromStorage={refreshGroupsFromStorage}
        />
      ))}
    </ul>
  )
}

function GroupsPage({
  children,
  reload,
}: PropsWithChildren<{ reload: () => void }>) {
  const t = useTranslations('Groups')
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="font-display text-4xl text-ink flex-1">
          <Link href="/groups">{t('myGroups')}</Link>
        </h1>
        <div className="flex flex-wrap gap-2">
          <AddGroupByUrlButton reload={reload} />
          <Button
            asChild
            variant="secondary"
            className="rounded-[10px] border-[1.5px] border-paper-dashed bg-transparent font-mono text-xs font-bold uppercase tracking-[0.06em] text-ink-soft hover:bg-paper-cream hover:text-ink"
          >
            <Link href="/join">Join with code</Link>
          </Button>
          <Button
            asChild
            className="rounded-[10px] bg-ink font-mono text-xs font-bold uppercase tracking-[0.06em] text-[#F7F1E3] shadow-ticket hover:bg-ink-deep active:translate-y-0.5 active:shadow-ticket-press"
          >
            <Link href="/groups/create">
              {/* <Plus className="w-4 h-4 mr-2" /> */}
              {t('create')}
            </Link>
          </Button>
        </div>
      </div>
      <div>{children}</div>
    </>
  )
}
