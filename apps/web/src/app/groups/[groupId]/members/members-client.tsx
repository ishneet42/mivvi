'use client'

import { useState } from 'react'
import { Check, Copy, Link as LinkIcon, Mail, Plus, Share2 } from 'lucide-react'
import { Avatar } from '@/components/avatar'

type Role = 'OWNER' | 'ADMIN' | 'MEMBER'

type Member = {
  id: string
  clerkUserId: string
  role: Role
  participantId: string | null
  username: string | null
  displayName: string | null
  avatarPreset: string | null
  avatarEmoji: string | null
  clerkImageUrl: string | null
}

export function MembersClient({
  groupId, groupName, currentUserId, currentRole,
  members, participants, invites,
}: {
  groupId: string
  groupName: string
  currentUserId: string
  currentRole: Role
  members: Member[]
  participants: { id: string; name: string; email: string | null; claimed: boolean; claimedBy: string | null }[]
  invites: { id: string; token: string; email: string | null; participantId: string | null; expiresAt: string }[]
}) {
  const isAdmin = currentRole === 'OWNER' || currentRole === 'ADMIN'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [shareBusy, setShareBusy] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareCopied, setShareCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function createShareLink() {
    setShareBusy(true); setError(null)
    try {
      const res = await fetch(`/api/groups/${groupId}/invites`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}), // no email, no name → general-purpose link
      })
      const j = (await res.json()) as { error?: string; token?: string }
      if (!res.ok || !j.token) throw new Error(j.error ?? 'failed')
      const url = `${window.location.origin}/invites/${j.token}`
      setShareUrl(url)
      // Copy straight away so the user can paste into a group chat.
      try {
        await navigator.clipboard.writeText(url)
        setShareCopied(true)
        setTimeout(() => setShareCopied(false), 2000)
      } catch {/* ignore clipboard errors */}
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setShareBusy(false)
    }
  }

  async function nativeShare() {
    if (!shareUrl) return
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await (navigator as any).share({
          title: `Join ${groupName} on Mivvi`,
          text: `Tap to join ${groupName} on Mivvi — it takes 10 seconds.`,
          url: shareUrl,
        })
      } catch { /* user cancelled */ }
    }
  }

  async function addFriend() {
    if (!email.trim()) { setError('Email required.'); return }
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/groups/${groupId}/invites`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined }),
      })
      const j = (await res.json()) as { error?: string; token?: string; email?: string }
      if (!res.ok || !j.token) throw new Error(j.error ?? 'failed')

      const url = `${window.location.origin}/invites/${j.token}`
      const subject = `Join me on Mivvi to split ${groupName}`
      const body = [
        `Hey,`,
        ``,
        `I'm using Mivvi to split our bills for ${groupName}. Tap this link to join and you'll see everything:`,
        ``,
        url,
        ``,
        `It takes ~10 seconds — one sign-in with Google and you're in.`,
      ].join('\n')
      const mailto = `mailto:${encodeURIComponent(j.email ?? email.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      // Open the user's default mail client with the prefilled invitation.
      window.location.href = mailto

      // Refresh by reloading (simpler than plumbing revalidation through to this client).
      setTimeout(() => window.location.reload(), 800)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function copyLink(token: string) {
    const url = `${window.location.origin}/invites/${token}`
    await navigator.clipboard.writeText(url)
    setCopiedId(token); setTimeout(() => setCopiedId(null), 1500)
  }

  function openMail(inv: { token: string; email: string | null }) {
    const url = `${window.location.origin}/invites/${inv.token}`
    const subject = `Join me on Mivvi to split ${groupName}`
    const body = `Tap this link to join ${groupName} on Mivvi:\n\n${url}\n`
    window.location.href = `mailto:${encodeURIComponent(inv.email ?? '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
        <p className="text-sm opacity-60 mt-1">Who can see and edit {groupName}.</p>
      </header>

      {/* Current members */}
      <section className="mb-8">
        <h2 className="text-sm font-medium mb-3 opacity-70">In this group · {members.length}</h2>
        <div className="rounded-[18px] bg-[rgba(255,253,247,0.7)] backdrop-blur-md border border-[rgba(255,255,255,0.5)] divide-y divide-[rgba(26,20,16,0.06)]">
          {members.map((m) => {
            const part = participants.find((p) => p.id === m.participantId)
            const isYou = m.clerkUserId === currentUserId
            const displayName = m.displayName || part?.name || 'Member'
            return (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar
                  size={40}
                  name={displayName}
                  // Priority: emoji > preset > clerk photo > deterministic fallback
                  clerkImageUrl={m.avatarEmoji || m.avatarPreset ? null : m.clerkImageUrl}
                  preset={m.avatarPreset}
                  emoji={m.avatarEmoji}
                  seed={m.clerkUserId}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">
                    {displayName}
                    {isYou && <span className="ml-2 text-xs opacity-60">(you)</span>}
                  </div>
                  <div className="text-xs opacity-50 mt-0.5 truncate">
                    {m.username ? `@${m.username}` : (part?.email ?? '—')}
                  </div>
                </div>
                <span className={
                  'text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ' +
                  (m.role === 'OWNER' ? 'bg-[rgba(229,99,78,0.15)] text-[#8A3A28]' :
                   m.role === 'ADMIN' ? 'bg-[rgba(26,20,16,0.08)]' : 'bg-[rgba(26,20,16,0.05)] opacity-70')
                }>
                  {m.role}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {/* Shareable invite link — anyone who opens it can join */}
      {isAdmin && (
        <section className="mb-8">
          <h2 className="text-sm font-medium mb-3 opacity-70 flex items-center gap-2">
            <Share2 className="w-4 h-4" /> Invite link
          </h2>
          <div className="rounded-[18px] bg-[rgba(255,253,247,0.7)] backdrop-blur-md border border-[rgba(255,255,255,0.5)] p-5">
            {!shareUrl ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  onClick={createShareLink}
                  disabled={shareBusy}
                  className="h-10 px-5 rounded-full bg-[#1A1410] text-[#F4ECDB] text-sm font-medium disabled:opacity-40 flex items-center gap-2 w-fit"
                >
                  <LinkIcon className="w-4 h-4" />
                  {shareBusy ? 'Generating…' : 'Create invite link'}
                </button>
                <span className="text-xs opacity-60">
                  One link, drop it in a group chat. Anyone who opens it can join.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={shareUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 h-10 px-4 rounded-full border border-[rgba(26,20,16,0.12)] bg-white/60 text-sm font-mono"
                  />
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(shareUrl)
                      setShareCopied(true); setTimeout(() => setShareCopied(false), 1500)
                    }}
                    className="h-10 px-4 rounded-full bg-[rgba(26,20,16,0.08)] text-sm font-medium flex items-center gap-1"
                  >
                    {shareCopied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
                  </button>
                  {typeof navigator !== 'undefined' && 'share' in (navigator as any) && (
                    <button
                      onClick={nativeShare}
                      className="h-10 px-4 rounded-full bg-[#1A1410] text-[#F4ECDB] text-sm font-medium flex items-center gap-1"
                    >
                      <Share2 className="w-4 h-4" /> Share
                    </button>
                  )}
                </div>
                <div className="text-xs opacity-60">
                  Valid for 14 days · anyone who opens this picks a participant and joins.
                  <button onClick={() => setShareUrl(null)} className="ml-2 underline">Generate a new one</button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Add a friend */}
      {isAdmin && (
        <section className="mb-8">
          <h2 className="text-sm font-medium mb-3 opacity-70 flex items-center gap-2"><Plus className="w-4 h-4" /> Add a friend by email</h2>
          <form
            onSubmit={(e) => { e.preventDefault(); addFriend() }}
            className="rounded-[18px] bg-[rgba(255,253,247,0.7)] backdrop-blur-md border border-[rgba(255,255,255,0.5)] p-5 space-y-3"
          >
            <div className="grid sm:grid-cols-2 gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Their name (optional)"
                className="h-10 px-4 rounded-full border border-[rgba(26,20,16,0.12)] bg-white/60 text-sm focus:outline-none focus:border-[rgba(26,20,16,0.4)]"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="friend@email.com"
                required
                className="h-10 px-4 rounded-full border border-[rgba(26,20,16,0.12)] bg-white/60 text-sm focus:outline-none focus:border-[rgba(26,20,16,0.4)]"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={busy}
                className="h-10 px-5 rounded-full bg-[#1A1410] text-[#F4ECDB] text-sm font-medium disabled:opacity-40 flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                {busy ? 'Adding…' : 'Add & send invite'}
              </button>
              <span className="text-xs opacity-60">Opens your mail app with a pre-filled invite.</span>
            </div>
            {error && <div className="text-sm text-[#8A3A28]">{error}</div>}
          </form>
        </section>
      )}

      {/* Pending invites */}
      {isAdmin && invites.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium mb-3 opacity-70">Pending invites · {invites.length}</h2>
          <div className="rounded-[18px] bg-[rgba(255,253,247,0.7)] backdrop-blur-md border border-[rgba(255,255,255,0.5)] divide-y divide-[rgba(26,20,16,0.06)]">
            {invites.map((inv) => {
              const pinned = participants.find((p) => p.id === inv.participantId)
              return (
                <div key={inv.id} className="px-4 py-3 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">
                      <span className="font-medium">{pinned?.name ?? 'Invitee'}</span>
                      {inv.email && <span className="opacity-60"> · {inv.email}</span>}
                    </div>
                    <div className="text-xs opacity-50 mt-0.5">expires {new Date(inv.expiresAt).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openMail(inv)} className="text-xs h-8 px-3 rounded-full bg-[rgba(26,20,16,0.08)] flex items-center gap-1"><Mail className="w-3 h-3" /> Resend</button>
                    <button onClick={() => copyLink(inv.token)} className="text-xs h-8 px-3 rounded-full bg-[rgba(26,20,16,0.08)] flex items-center gap-1">
                      {copiedId === inv.token ? <><Check className="w-3 h-3" /> Copied</> : <><LinkIcon className="w-3 h-3" /> Copy</>}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
