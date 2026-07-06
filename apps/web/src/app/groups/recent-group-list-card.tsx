import {
  RecentGroup,
  archiveGroup,
  deleteRecentGroup,
  starGroup,
  unarchiveGroup,
  unstarGroup,
} from '@/app/groups/recent-groups-helpers'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { StarFilledIcon } from '@radix-ui/react-icons'
import { Calendar, MoreHorizontal, Star, Users } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Receipt-diner avatar palette (design handoff). The recent-groups payload
// doesn't include participant identities, so each group gets a single
// group-initial circle with a color picked deterministically from its id.
const AVATAR_COLORS = [
  '#E0452B',
  '#2F4E78',
  '#C77D2E',
  '#5B7A4E',
  '#8A5BB0',
  '#3F6E8C',
]

function avatarColor(groupId: string) {
  let hash = 0
  for (let i = 0; i < groupId.length; i++) {
    hash = (hash * 31 + groupId.charCodeAt(i)) >>> 0
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export function RecentGroupListCard({
  group,
  groupDetail,
  isStarred,
  isArchived,
  refreshGroupsFromStorage,
}: {
  group: RecentGroup
  groupDetail?: AppRouterOutput['groups']['list']['groups'][number]
  isStarred: boolean
  isArchived: boolean
  refreshGroupsFromStorage: () => void
}) {
  const router = useRouter()
  const locale = useLocale()
  const toast = useToast()
  const t = useTranslations('Groups')

  return (
    <li key={group.id}>
      <div
        className={
          'flex w-full cursor-pointer items-center gap-3 rounded-[14px] border border-paper-edge bg-paper-cream px-3 py-3 transition-shadow hover:shadow-paper-lift' +
          (isArchived ? ' opacity-70' : '')
        }
        onClick={() => router.push(`/groups/${group.id}`)}
      >
        <div
          aria-hidden
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-display text-lg text-paper-cream ring-2 ring-paper-cream"
          style={{ backgroundColor: avatarColor(group.id) }}
        >
          {group.name.trim().charAt(0) || '?'}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/groups/${group.id}`}
              className="min-w-0 truncate pt-0.5 font-display text-lg leading-none text-ink"
            >
              {group.name}
            </Link>
            {isArchived && (
              <span className="flex-shrink-0 rounded-md border-[1.5px] border-paper-dashed px-2 py-[3px] font-mono text-[10px] uppercase tracking-[0.06em] text-[#7A7560]">
                Archived
              </span>
            )}
          </div>
          <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.06em] text-label">
            {groupDetail ? (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {groupDetail._count.participants}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(groupDetail.createdAt).toLocaleDateString(locale, {
                    dateStyle: 'medium',
                  })}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-8 rounded-full bg-paper-dashed/50" />
                <Skeleton className="h-3 w-24 rounded-full bg-paper-dashed/50" />
              </div>
            )}
          </div>
        </div>

        <span className="flex flex-shrink-0 items-center">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full hover:bg-paper-deep/60"
            onClick={(event) => {
              event.stopPropagation()
              if (isStarred) {
                unstarGroup(group.id)
              } else {
                starGroup(group.id)
                unarchiveGroup(group.id)
              }
              refreshGroupsFromStorage()
            }}
          >
            {isStarred ? (
              <StarFilledIcon className="h-4 w-4 text-redpen" />
            ) : (
              <Star className="h-4 w-4 text-label" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full hover:bg-paper-deep/60"
              >
                <MoreHorizontal className="h-4 w-4 text-label" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive"
                onClick={(event) => {
                  event.stopPropagation()
                  deleteRecentGroup(group)
                  refreshGroupsFromStorage()

                  toast.toast({
                    title: t('RecentRemovedToast.title'),
                    description: t('RecentRemovedToast.description'),
                  })
                }}
              >
                {t('removeRecent')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(event) => {
                  event.stopPropagation()
                  if (isArchived) {
                    unarchiveGroup(group.id)
                  } else {
                    archiveGroup(group.id)
                    unstarGroup(group.id)
                  }
                  refreshGroupsFromStorage()
                }}
              >
                {t(isArchived ? 'unarchive' : 'archive')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </div>
    </li>
  )
}
