import { saveRecentGroup } from '@/app/groups/recent-groups-helpers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useMediaQuery } from '@/lib/hooks'
import { trpc } from '@/trpc/client'
import { Loader2, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  reload: () => void
}

// Recognize both group URLs and invite URLs. Works for any origin (localhost
// in dev, the live domain in prod) by matching the path segment.
function parseUrl(raw: string): { kind: 'invite'; token: string } | { kind: 'group'; groupId: string } | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  // Invite URL: .../invites/<token>
  const inviteMatch = trimmed.match(/\/invites\/([^/?#]+)/)
  if (inviteMatch) return { kind: 'invite', token: inviteMatch[1] }
  // Group URL: .../groups/<id>   (but not /groups/create)
  const groupMatch = trimmed.match(/\/groups\/([^/?#]+)/)
  if (groupMatch && groupMatch[1] !== 'create') return { kind: 'group', groupId: groupMatch[1] }
  return null
}

export function AddGroupByUrlButton({ reload }: Props) {
  const t = useTranslations('Groups.AddByURL')
  const router = useRouter()
  const isDesktop = useMediaQuery('(min-width: 640px)')
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const utils = trpc.useUtils()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary">{t('button')}</Button>
      </PopoverTrigger>
      <PopoverContent
        align={isDesktop ? 'end' : 'start'}
        className="[&_p]:text-sm flex flex-col gap-3"
      >
        <h3 className="font-bold">{t('title')}</h3>
        <p>Paste a group URL you already own, or an invite link someone shared with you.</p>
        <form
          className="flex gap-2"
          onSubmit={async (event) => {
            event.preventDefault()
            setError(null)
            const parsed = parseUrl(url)
            if (!parsed) {
              setError("That doesn't look like a Mivvi group or invite URL.")
              return
            }

            // Invite link → go to the accept page; it handles sign-in + membership.
            if (parsed.kind === 'invite') {
              setPending(true)
              router.push(`/invites/${parsed.token}`)
              return
            }

            // Group URL → look it up via tRPC and add to recents if the current
            // user has access. Wrapped so errors always clear the spinner.
            setPending(true)
            try {
              const { group } = await utils.groups.get.fetch({ groupId: parsed.groupId })
              if (!group) {
                setError('Group not found or you don\'t have access.')
                return
              }
              saveRecentGroup({ id: group.id, name: group.name })
              reload()
              setUrl('')
              setOpen(false)
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Something went wrong.')
            } finally {
              setPending(false)
            }
          }}
        >
          <Input
            type="text"
            required
            placeholder="https://mivvi.app/groups/... or /invites/..."
            className="flex-1 text-base"
            value={url}
            disabled={pending}
            onChange={(event) => {
              setUrl(event.target.value)
              setError(null)
            }}
          />
          <Button size="icon" type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </Button>
        </form>
        {error && <p className="text-destructive">{error}</p>}
      </PopoverContent>
    </Popover>
  )
}
