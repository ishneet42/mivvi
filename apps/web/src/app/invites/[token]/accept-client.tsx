'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Participant = {
  id: string
  name: string
  email: string | null
  claimed: boolean
  isYou: boolean
  matchesYourEmail: boolean
}

export function AcceptClient({
  token, invalid, groupId, groupName, pinnedParticipantId, myEmail, participants,
}: {
  token: string
  invalid: boolean
  groupId: string
  groupName: string
  pinnedParticipantId: string | null
  myEmail: string | null
  participants: Participant[]
}) {
  const router = useRouter()
  const emailMatch = participants.find((p) => !p.claimed && p.matchesYourEmail)
  const initialChoice = emailMatch?.id ?? pinnedParticipantId ?? ''
  const [choice, setChoice] = useState<string>(initialChoice)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // One-tap accept if the email match is unambiguous.
  const [autoTried, setAutoTried] = useState(false)
  useEffect(() => {
    if (!autoTried && emailMatch && !invalid) {
      setAutoTried(true)
      // We DON'T auto-submit — the user should see the confirmation. But we
      // do pre-select and visually emphasize their match below.
    }
  }, [autoTried, emailMatch, invalid])

  async function accept() {
    setBusy(true); setError(null)
    try {
      const body: Record<string, string> = {}
      if (choice === '__new__') body.newParticipantName = newName.trim()
      else if (choice) body.participantId = choice
      else { setError('Pick a participant or create a new one.'); return }
      const res = await fetch(`/api/invites/${token}/accept`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(j.error ?? 'failed')
      router.push(`/groups/${groupId}/expenses`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (invalid) {
    return (
      <main className="max-w-md mx-auto px-6 py-24 text-center">
        <div className="sx-orb mx-auto mb-6" style={{ width: 80, height: 80 }} />
        <h1 className="text-2xl font-semibold mb-2">Invite unavailable</h1>
        <p className="text-sm opacity-70">This invite has expired, been revoked, or already been used. Ask your friend for a fresh link.</p>
      </main>
    )
  }

  const unclaimed = participants.filter((p) => !p.claimed)
  const claimedByYou = participants.find((p) => p.isYou)

  return (
    <main className="max-w-md mx-auto px-6 py-16">
      <div className="sx-orb mx-auto mb-6" style={{ width: 80, height: 80 }} />
      <h1 className="text-2xl font-semibold tracking-tight mb-2 text-center">
        Join <span className="text-[color:var(--sx-mocha-dark,#7A6B56)]">{groupName}</span>
      </h1>
      <p className="text-sm opacity-70 text-center mb-8">
        {emailMatch
          ? <>Looks like you&apos;re <strong>{emailMatch.name}</strong>. Tap Join to confirm.</>
          : <>Pick which participant you are, or create a new one.</>}
      </p>

      {claimedByYou && (
        <div className="mb-4 p-3 rounded-xl bg-[rgba(203,212,188,0.5)] text-xs text-center">
          You already claimed <b>{claimedByYou.name}</b> in this group.
        </div>
      )}

      <div className="rounded-[18px] bg-[rgba(255,253,247,0.7)] backdrop-blur-md border border-[rgba(255,255,255,0.5)] divide-y divide-[rgba(26,20,16,0.06)] mb-4">
        {unclaimed.map((p) => {
          const isMatch = p.matchesYourEmail
          return (
            <label
              key={p.id}
              className={
                'flex items-center gap-3 px-4 py-3 cursor-pointer ' +
                (isMatch ? 'bg-[rgba(203,212,188,0.35)]' : '')
              }
            >
              <input
                type="radio"
                name="claim"
                value={p.id}
                checked={choice === p.id}
                onChange={() => setChoice(p.id)}
                className="accent-[#1A1410]"
              />
              <span className="text-sm">{p.name}</span>
              {p.email && <span className="text-xs opacity-50 truncate max-w-[140px]">{p.email}</span>}
              {isMatch && <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-[#CBD4BC] text-[#2C3A1F] font-medium">matches your email</span>}
              {!isMatch && pinnedParticipantId === p.id && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-[rgba(229,99,78,0.15)] text-[#8A3A28]">invited</span>
              )}
            </label>
          )
        })}
        <label className="flex items-center gap-3 px-4 py-3 cursor-pointer">
          <input
            type="radio"
            name="claim"
            value="__new__"
            checked={choice === '__new__'}
            onChange={() => setChoice('__new__')}
            className="accent-[#1A1410]"
          />
          <span className="text-sm shrink-0">I&apos;m new:</span>
          <input
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setChoice('__new__') }}
            placeholder="your name"
            className="flex-1 h-8 px-3 rounded-full border border-[rgba(26,20,16,0.12)] bg-white/50 text-sm"
          />
        </label>
      </div>

      {error && <div className="mb-3 p-2 rounded-xl bg-[rgba(229,99,78,0.1)] border border-[rgba(229,99,78,0.3)] text-sm text-center">{error}</div>}

      <button
        onClick={accept}
        disabled={busy || !choice || (choice === '__new__' && !newName.trim())}
        className="w-full h-12 rounded-full bg-[#1A1410] text-[#F4ECDB] font-medium disabled:opacity-40"
      >
        {busy ? 'Joining…' : `Join ${groupName}`}
      </button>

      {myEmail && (
        <p className="text-[11px] opacity-40 text-center mt-3">Signed in as {myEmail}</p>
      )}
    </main>
  )
}
