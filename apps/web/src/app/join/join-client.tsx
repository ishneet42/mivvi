'use client'

// Two-stage flow. Stage 1: type a 6-char code, we validate it.
// Stage 2: default path shows "Join {group} as {your name}" — one tap and
// done. The server auto-matches your Clerk display name to an unclaimed
// participant, or creates a new one. A small "Not you?" link reveals a
// picker + custom-name field for the rare override case.
import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Check, Loader2 } from 'lucide-react'

type Lookup = {
  groupId: string
  groupName: string
  myName: string
  autoMatchParticipantId: string | null
  participants: { id: string; name: string }[]
  remainingUses: number
}

function clean(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}
function display(raw: string): string {
  const c = clean(raw)
  return c.length > 3 ? `${c.slice(0, 3)}-${c.slice(3)}` : c
}

export function JoinClient() {
  const router = useRouter()
  const search = useSearchParams()
  const [raw, setRaw] = useState(search.get('c') ?? '')
  const [stage, setStage] = useState<'code' | 'confirm'>('code')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lookup, setLookup] = useState<Lookup | null>(null)
  const [override, setOverride] = useState(false)
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  async function lookupCode(raw: string) {
    const code = clean(raw)
    if (code.length !== 6) { setError('Codes are 6 characters.'); return }
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/invites/code/${code}`)
      const j = (await res.json()) as Lookup & { error?: string }
      if (!res.ok) throw new Error(j.error ?? 'code lookup failed')
      setLookup(j)
      setStage('confirm')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function join(asNewName?: string, asParticipantId?: string) {
    if (!lookup) return
    // No body = server uses Clerk display name (the happy path).
    // Body with participantId = explicit pick from the override picker.
    // Body with newParticipantName = "I'm someone new" from the override input.
    const body: { participantId?: string; newParticipantName?: string } = {}
    if (asParticipantId) body.participantId = asParticipantId
    else if (asNewName?.trim()) body.newParticipantName = asNewName.trim()

    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/invites/code/${clean(raw)}/accept`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = (await res.json()) as { groupId?: string; error?: string }
      if (!res.ok || !j.groupId) throw new Error(j.error ?? 'join failed')
      router.push(`/groups/${j.groupId}/expenses`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  useEffect(() => {
    const q = search.get('c')
    if (q && clean(q).length === 6) { void lookupCode(q) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="max-w-md mx-auto px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">Join a group</h1>
      <p className="text-sm opacity-60 mb-8">
        Type the 6-character code a friend shared with you.
      </p>

      {stage === 'code' && (
        <form
          onSubmit={(e) => { e.preventDefault(); lookupCode(raw) }}
          className="flex gap-2 mb-4"
        >
          <input
            ref={inputRef}
            value={display(raw)}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="ABC-X7K"
            autoComplete="off"
            spellCheck={false}
            maxLength={7}
            className="flex-1 h-14 px-5 rounded-full border border-[rgba(26,20,16,0.12)] bg-[rgba(255,253,247,0.7)] backdrop-blur-md text-2xl font-mono tracking-[0.2em] uppercase focus:outline-none focus:border-[rgba(26,20,16,0.4)]"
          />
          <button
            type="submit"
            disabled={busy || clean(raw).length !== 6}
            className="h-14 px-5 rounded-full bg-[#1A1410] text-[#F4ECDB] font-medium disabled:opacity-40 flex items-center gap-1"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Next <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>
      )}

      {stage === 'confirm' && lookup && (
        <div className="rounded-[22px] bg-[rgba(255,253,247,0.7)] backdrop-blur-md border border-[rgba(255,255,255,0.5)] p-6 mb-4">
          <div className="mb-5">
            <div className="text-xs opacity-60 mb-1">Joining</div>
            <div className="text-xl font-semibold">{lookup.groupName}</div>
          </div>

          {!override ? (
            <>
              <button
                onClick={() => join()}
                disabled={busy}
                className="w-full h-12 rounded-full bg-[#1A1410] text-[#F4ECDB] font-medium disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {busy
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <>Join as {lookup.myName} <ArrowRight className="w-4 h-4" /></>}
              </button>
              {lookup.autoMatchParticipantId && (
                <div className="mt-3 text-xs opacity-60 text-center">
                  We found you in the participant list — you&rsquo;ll be claimed automatically.
                </div>
              )}
              <button
                onClick={() => setOverride(true)}
                className="mt-4 w-full text-xs opacity-60 underline"
              >
                Not you? Pick a different participant
              </button>
            </>
          ) : (
            <>
              {lookup.participants.length > 0 && (
                <>
                  <div className="text-xs font-medium opacity-70 mb-2">Pick a participant</div>
                  <div className="space-y-1.5 mb-4">
                    {lookup.participants.map((pp) => (
                      <label
                        key={pp.id}
                        className={
                          'flex items-center gap-3 px-4 py-3 rounded-2xl border cursor-pointer transition ' +
                          (participantId === pp.id
                            ? 'border-[#E5634E] bg-[rgba(229,99,78,0.1)]'
                            : 'border-[rgba(26,20,16,0.1)] bg-white/40 hover:bg-white/60')
                        }
                      >
                        <input
                          type="radio"
                          name="participant"
                          checked={participantId === pp.id}
                          onChange={() => { setParticipantId(pp.id); setNewName('') }}
                          className="sr-only"
                        />
                        <span className="flex-1 text-sm font-medium">{pp.name}</span>
                        {participantId === pp.id && <Check className="w-4 h-4 text-[#E5634E]" />}
                      </label>
                    ))}
                  </div>
                  <div className="text-xs opacity-60 mb-2">or type a different name:</div>
                </>
              )}

              <input
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setParticipantId(null) }}
                placeholder="Your name"
                className="w-full h-11 px-4 rounded-full border border-[rgba(26,20,16,0.12)] bg-white/60 text-sm focus:outline-none focus:border-[rgba(26,20,16,0.4)]"
              />

              <button
                onClick={() => join(newName, participantId ?? undefined)}
                disabled={busy || (!participantId && !newName.trim())}
                className="mt-5 w-full h-12 rounded-full bg-[#1A1410] text-[#F4ECDB] font-medium disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {busy
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <>Join {lookup.groupName} <ArrowRight className="w-4 h-4" /></>}
              </button>

              <button
                onClick={() => { setOverride(false); setParticipantId(null); setNewName('') }}
                className="mt-3 w-full text-xs opacity-60 underline"
              >
                Back to &ldquo;Join as {lookup.myName}&rdquo;
              </button>
            </>
          )}

          <button
            onClick={() => { setStage('code'); setLookup(null); setParticipantId(null); setNewName(''); setOverride(false) }}
            className="mt-3 w-full text-xs opacity-40 underline"
          >
            Use a different code
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-[rgba(229,99,78,0.1)] border border-[rgba(229,99,78,0.3)] text-sm">
          {error}
        </div>
      )}
    </main>
  )
}
