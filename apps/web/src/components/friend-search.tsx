'use client'

// Typeahead that searches the Mivvi user directory by @username. Selecting a
// result calls onSelect with the friend's display info; callers typically
// append the result to a participants list + stash the clerkUserId on it so
// the server can create a GroupMember for that user at submit time.
import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, Search, UserPlus } from 'lucide-react'
import { Avatar } from '@/components/avatar'

export type FoundUser = {
  clerkUserId: string
  username: string
  displayName: string | null
  avatarEmoji: string | null
  avatarPreset: string | null
}

type Props = {
  onSelect: (user: FoundUser) => void
  /** Optional: clerkUserIds to mark as already-added. */
  alreadyAddedIds?: string[]
  className?: string
}

export function FriendSearch({ onSelect, alreadyAddedIds = [], className }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoundUser[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const seqRef = useRef(0)

  useEffect(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) { setResults([]); return }
    const mySeq = ++seqRef.current
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`)
        if (!res.ok) throw new Error(String(res.status))
        const { users } = (await res.json()) as { users: FoundUser[] }
        if (seqRef.current === mySeq) { setResults(users); setOpen(true) }
      } catch {
        if (seqRef.current === mySeq) setResults([])
      } finally {
        if (seqRef.current === mySeq) setLoading(false)
      }
    }, 160)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const addedSet = new Set(alreadyAddedIds)

  return (
    <div ref={wrapRef} className={'relative ' + (className ?? '')}>
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50 pointer-events-none" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
          placeholder="Search @username"
          className="w-full h-10 pl-9 pr-4 rounded-full border border-[rgba(26,20,16,0.12)] bg-white/70 text-sm focus:outline-none focus:border-[rgba(26,20,16,0.4)]"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin opacity-50" />}
      </div>

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-11 rounded-2xl bg-[rgba(255,253,247,0.98)] backdrop-blur-md border border-[rgba(26,20,16,0.08)] shadow-[0_20px_60px_-20px_rgba(26,20,16,0.3)] z-20 overflow-hidden">
          {results.map((u) => {
            const added = addedSet.has(u.clerkUserId)
            return (
              <button
                key={u.clerkUserId}
                type="button"
                disabled={added}
                onClick={() => {
                  if (added) return
                  onSelect(u)
                  setQuery('')
                  setResults([])
                  setOpen(false)
                }}
                className={
                  'w-full px-3 py-2 flex items-center gap-3 text-left transition ' +
                  (added
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-[rgba(26,20,16,0.05)]')
                }
              >
                <Avatar
                  size={32}
                  name={u.displayName ?? u.username}
                  emoji={u.avatarEmoji}
                  preset={u.avatarPreset}
                  seed={u.clerkUserId}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {u.displayName || u.username}
                  </div>
                  <div className="text-xs opacity-55 truncate">@{u.username}</div>
                </div>
                {added
                  ? <Check className="w-4 h-4 opacity-70" />
                  : <UserPlus className="w-4 h-4 opacity-70" />}
              </button>
            )
          })}
        </div>
      )}

      {open && !loading && query.trim().length >= 2 && results.length === 0 && (
        <div className="absolute left-0 right-0 top-11 rounded-2xl bg-[rgba(255,253,247,0.98)] border border-[rgba(26,20,16,0.08)] px-4 py-3 text-xs opacity-60 z-20">
          No users matching &ldquo;@{query.trim()}&rdquo;. Invite them by email below instead.
        </div>
      )}
    </div>
  )
}
