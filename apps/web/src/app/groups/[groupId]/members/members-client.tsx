'use client'

import { useState } from 'react'
import { Check, Copy, KeyRound, RefreshCw, Share2 } from 'lucide-react'
import { Avatar } from '@/components/avatar'
import { formatCode } from '@/lib/invite-code'

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

type CodeInvite = {
  id: string
  code: string
  maxUses: number
  usedCount: number
  expiresAt: string
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
  invites: CodeInvite[]
}) {
  const isAdmin = currentRole === 'OWNER' || currentRole === 'ADMIN'

  // The "active" code is the most recently created unexhausted one. If none
  // exists, the user taps "Generate join code" to create one.
  const [activeCode, setActiveCode] = useState<CodeInvite | null>(invites[0] ?? null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generateCode() {
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/groups/${groupId}/invites`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      })
      const j = (await res.json()) as CodeInvite & { error?: string }
      if (!res.ok || !j.code) throw new Error(j.error ?? 'failed')
      setActiveCode(j)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard blocked */ }
  }

  async function shareNative(code: string) {
    if (typeof navigator === 'undefined' || !('share' in navigator)) return
    const url = `${window.location.origin}/join?c=${code}`
    try {
      await (navigator as any).share({
        title: `Join ${groupName} on Mivvi`,
        text: `Your Mivvi code for ${groupName}: ${formatCode(code)}`,
        url,
      })
    } catch { /* user cancelled */ }
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

      {/* Join code */}
      {isAdmin && (
        <section className="mb-8">
          <h2 className="text-sm font-medium mb-3 opacity-70 flex items-center gap-2">
            <KeyRound className="w-4 h-4" /> Join code
          </h2>
          <div className="rounded-[18px] bg-[rgba(255,253,247,0.7)] backdrop-blur-md border border-[rgba(255,255,255,0.5)] p-6">
            {!activeCode ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  onClick={generateCode}
                  disabled={busy}
                  className="h-11 px-5 rounded-full bg-[#1A1410] text-[#F4ECDB] text-sm font-medium disabled:opacity-40 flex items-center gap-2 w-fit"
                >
                  <KeyRound className="w-4 h-4" />
                  {busy ? 'Generating…' : 'Generate join code'}
                </button>
                <span className="text-xs opacity-60">
                  Share the 6-character code with friends. They tap <span className="font-medium">Join a group</span> and type it in.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="text-4xl sm:text-5xl font-mono tracking-[0.25em] font-semibold text-[#1A1410] select-all"
                    aria-label="Join code"
                  >
                    {formatCode(activeCode.code)}
                  </div>
                  <div className="text-xs opacity-60">
                    {activeCode.usedCount}/{activeCode.maxUses} used · expires {new Date(activeCode.expiresAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={() => copy(formatCode(activeCode.code))}
                    className="h-10 px-4 rounded-full bg-[rgba(26,20,16,0.08)] text-sm font-medium flex items-center gap-1"
                  >
                    {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy code</>}
                  </button>
                  {typeof navigator !== 'undefined' && 'share' in (navigator as any) && (
                    <button
                      onClick={() => shareNative(activeCode.code)}
                      className="h-10 px-4 rounded-full bg-[#1A1410] text-[#F4ECDB] text-sm font-medium flex items-center gap-1"
                    >
                      <Share2 className="w-4 h-4" /> Share
                    </button>
                  )}
                  <button
                    onClick={generateCode}
                    disabled={busy}
                    className="h-10 px-4 rounded-full bg-[rgba(26,20,16,0.08)] text-sm font-medium flex items-center gap-1 disabled:opacity-40"
                  >
                    <RefreshCw className={'w-4 h-4 ' + (busy ? 'animate-spin' : '')} /> New code
                  </button>
                </div>

                <div className="text-xs opacity-60 text-center">
                  Friends go to <span className="font-mono">/join</span> and type the code.
                </div>
              </div>
            )}
            {error && <div className="sx-error-box mt-3">{error}</div>}
          </div>
        </section>
      )}

      {/* Other active codes (if a new one was generated but old ones still valid) */}
      {isAdmin && invites.length > 1 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium mb-3 opacity-70">Other active codes · {invites.length - 1}</h2>
          <div className="rounded-[18px] bg-[rgba(255,253,247,0.7)] backdrop-blur-md border border-[rgba(255,255,255,0.5)] divide-y divide-[rgba(26,20,16,0.06)]">
            {invites.filter((c) => c.id !== activeCode?.id).map((c) => (
              <div key={c.id} className="px-4 py-3 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-base font-mono tracking-wider">{formatCode(c.code)}</div>
                  <div className="text-xs opacity-50 mt-0.5">
                    {c.usedCount}/{c.maxUses} used · expires {new Date(c.expiresAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => copy(formatCode(c.code))}
                  className="text-xs h-8 px-3 rounded-full bg-[rgba(26,20,16,0.08)] flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
