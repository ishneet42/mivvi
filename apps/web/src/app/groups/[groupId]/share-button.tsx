'use client'
// Group-header Share button.
//
// Shares a JOIN LINK (/join?c=<code>), not the raw group URL. The old
// implementation shared /groups/<id>/expenses?ref=share — but group pages
// are membership-gated (groups.get throws FORBIDDEN for non-members), so
// recipients who weren't already in the group hit a dead "forbidden" page.
// Join codes are the only path that actually enrolls the visitor.
//
// Codes are minted lazily on first popover open: reuse the newest live code
// if one exists (GET is member-readable), otherwise mint one (POST requires
// group admin — non-admins get a pointer to ask the owner).
import { CopyButton } from '@/components/copy-button'
import { ShareUrlButton } from '@/components/share-url-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useBaseUrl } from '@/lib/hooks'
import { Group } from '@prisma/client'
import { Loader2, Share } from 'lucide-react'
import { useState } from 'react'

type Props = {
  group: Group
}

type InviteRow = {
  code: string | null
  maxUses: number
  usedCount: number
  expiresAt: string
}

export function ShareButton({ group }: Props) {
  const baseUrl = useBaseUrl()
  const [code, setCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function ensureCode() {
    if (code || loading) return
    setLoading(true)
    setError(null)
    try {
      // Reuse the newest still-usable code if the group already has one.
      const listRes = await fetch(`/api/groups/${group.id}/invites`)
      if (listRes.ok) {
        const invites = (await listRes.json()) as InviteRow[]
        const live = invites.find(
          (i) => i.code && i.usedCount < i.maxUses,
        )
        if (live?.code) {
          setCode(live.code)
          return
        }
      }
      // None live — mint one (admin-only).
      const mintRes = await fetch(`/api/groups/${group.id}/invites`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      })
      const j = (await mintRes.json().catch(() => ({}))) as {
        code?: string
        error?: string
      }
      if (mintRes.status === 403) {
        setError(
          'Only the group owner can create invite links — ask them to share one.',
        )
        return
      }
      if (!mintRes.ok || !j.code) throw new Error(j.error ?? 'failed')
      setCode(j.code)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const url = baseUrl && code ? `${baseUrl}/join?c=${code}` : null

  return (
    <Popover onOpenChange={(open) => open && void ensureCode()}>
      <PopoverTrigger asChild>
        <Button title="Share" size="icon" className="flex-shrink-0">
          <Share className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="[&_p]:text-sm flex flex-col gap-3">
        <p>
          Send this invite link — friends tap it, sign in, and land in{' '}
          <strong>{group.name}</strong>.
        </p>
        {loading && (
          <div className="flex items-center gap-2 text-sm opacity-70">
            <Loader2 className="w-4 h-4 animate-spin" />
            Getting your invite link…
          </div>
        )}
        {error && <p className="sx-error-text">{error}</p>}
        {url && (
          <>
            <div className="flex gap-2">
              <Input className="flex-1 font-mono text-xs" defaultValue={url} readOnly />
              <CopyButton text={url} />
              <ShareUrlButton
                text={`Join my group ${group.name} on Mivvi`}
                url={url}
              />
            </div>
            <p className="text-xs opacity-60">
              Or they can enter code{' '}
              <span className="font-mono font-bold tracking-[0.14em]">
                {code}
              </span>{' '}
              on the join page. Valid 14 days.
            </p>
          </>
        )}
        <p>
          <strong>Heads up:</strong> anyone with this link can join the group
          and see its expenses. Share with people you trust.
        </p>
      </PopoverContent>
    </Popover>
  )
}
