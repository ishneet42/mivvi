'use client'

// Mivvi header user menu: our Avatar (honoring the emoji/preset the user picked
// on /profile) with a dropdown that keeps Clerk's sign-out and "manage account"
// flows — so we get consistent branding without losing Clerk's auth plumbing.
import { useClerk, useUser } from '@clerk/nextjs'
import { LogOut, Settings, User as UserIcon } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Avatar } from '@/components/avatar'

type ProfileResponse = {
  username: string | null
  displayName: string | null
  avatarPreset: string | null
  avatarEmoji: string | null
}

export function HeaderUserMenu() {
  const { user, isLoaded } = useUser()
  const { signOut, openUserProfile } = useClerk()
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Fetch once on mount. Also refetch when the window regains focus so the
    // avatar updates quickly after the user changes it on /profile.
    const load = () => {
      fetch('/api/profile', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((p) => p && setProfile(p as ProfileResponse))
        .catch(() => { /* ignore */ })
    }
    load()
    window.addEventListener('focus', load)
    return () => window.removeEventListener('focus', load)
  }, [])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!isLoaded || !user) return null

  const name = profile?.displayName || user.firstName || user.primaryEmailAddress?.emailAddress || 'You'
  const hasMivviAvatar = !!(profile?.avatarEmoji || profile?.avatarPreset)

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="focus:outline-none focus:ring-2 focus:ring-[#1A1410] focus:ring-offset-2 focus:ring-offset-[#F4ECDB] rounded-full"
        aria-label="User menu"
      >
        <Avatar
          size={32}
          name={name}
          emoji={profile?.avatarEmoji ?? null}
          preset={profile?.avatarPreset ?? null}
          // Fall back to the Clerk photo ONLY if the user hasn't picked a
          // Mivvi emoji or preset.
          clerkImageUrl={hasMivviAvatar ? null : user.imageUrl ?? null}
          seed={user.id}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 w-64 rounded-2xl bg-[rgba(255,253,247,0.96)] backdrop-blur-md border border-[rgba(26,20,16,0.08)] shadow-[0_20px_60px_-20px_rgba(26,20,16,0.25)] overflow-hidden z-50"
        >
          {/* Identity card */}
          <div className="px-4 py-4 flex items-center gap-3 border-b border-[rgba(26,20,16,0.06)]">
            <Avatar
              size={40}
              name={name}
              emoji={profile?.avatarEmoji ?? null}
              preset={profile?.avatarPreset ?? null}
              clerkImageUrl={hasMivviAvatar ? null : user.imageUrl ?? null}
              seed={user.id}
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate">{profile?.displayName || user.firstName || 'Member'}</div>
              <div className="text-xs opacity-55 truncate">
                {profile?.username ? `@${profile.username}` : user.primaryEmailAddress?.emailAddress ?? ''}
              </div>
            </div>
          </div>

          <div className="py-1">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[rgba(26,20,16,0.05)] transition"
            >
              <UserIcon className="w-4 h-4 opacity-70" />
              Your profile
            </Link>
            <button
              onClick={() => { setOpen(false); openUserProfile() }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[rgba(26,20,16,0.05)] transition text-left"
            >
              <Settings className="w-4 h-4 opacity-70" />
              Manage account
            </button>
          </div>

          <div className="border-t border-[rgba(26,20,16,0.06)] py-1">
            <button
              onClick={() => signOut({ redirectUrl: '/' })}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[rgba(229,99,78,0.08)] transition text-[#8A3A28] text-left"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
