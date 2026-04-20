'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2 } from 'lucide-react'

export function OnboardingClient({
  suggested,
  nextHref,
}: {
  suggested: string
  nextHref: string
}) {
  const router = useRouter()
  const [name, setName] = useState(suggested)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select() }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setError('Please enter a name.'); return }
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName: trimmed }),
      })
      if (!res.ok) throw new Error(await res.text())
      router.push(nextHref)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  return (
    <main className="max-w-md mx-auto px-6 py-16">
      <div className="flex flex-col items-center mb-8">
        <div className="sx-orb mb-6" style={{ width: 96, height: 96 }} />
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Welcome to Mivvi</h1>
        <p className="text-sm opacity-60 text-center">
          What should your friends call you when you&rsquo;re splitting bills?
        </p>
      </div>

      <form onSubmit={save} className="rounded-[22px] bg-[rgba(255,253,247,0.7)] backdrop-blur-md border border-[rgba(255,255,255,0.5)] p-6">
        <label className="block text-xs font-medium opacity-70 mb-2">
          Your name
        </label>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Ishi"
          maxLength={40}
          className="w-full h-12 px-4 rounded-full border border-[rgba(26,20,16,0.12)] bg-white/60 text-base focus:outline-none focus:border-[rgba(26,20,16,0.4)]"
        />
        <p className="mt-2 text-xs opacity-60">
          Shown on receipts, invites, and balances. You can change it later on{' '}
          <span className="font-mono">/profile</span>.
        </p>

        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="mt-5 w-full h-12 rounded-full bg-[#1A1410] text-[#F4ECDB] font-medium disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {busy
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <>Continue <ArrowRight className="w-4 h-4" /></>}
        </button>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-[rgba(229,99,78,0.1)] border border-[rgba(229,99,78,0.3)] text-sm">
            {error}
          </div>
        )}
      </form>
    </main>
  )
}
