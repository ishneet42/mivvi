'use client'

// Post-create share sheet — immediately after the group is made, show the
// invite link so the owner can copy/share/email before ever leaving the
// create flow. Dismissing lands them on the group's Members tab.
import { ArrowRight, Check, Copy, Link as LinkIcon, Loader2, Mail, Share2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ReceiptMark } from '@/components/receipt-mark'

export function GroupCreatedShare({ groupId, groupName }: { groupId: string; groupName: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}/invites`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        })
        // The invites API mints 6-char join codes (see route.ts); the join
        // page consumes them as /join?c=<code>.
        const j = (await res.json()) as { error?: string; code?: string }
        if (!res.ok || !j.code) throw new Error(j.error ?? 'failed')
        if (!cancelled) {
          setCode(j.code)
          setUrl(`${window.location.origin}/join?c=${j.code}`)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [groupId])

  async function copy() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function nativeShare() {
    if (!url) return
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await (navigator as any).share({
          title: `Join ${groupName} on Mivvi`,
          text: `Tap to join ${groupName} on Mivvi — it takes 10 seconds.`,
          url,
        })
      } catch { /* user cancelled */ }
    }
  }

  function openMail() {
    if (!url) return
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
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const canNativeShare = typeof navigator !== 'undefined' && 'share' in (navigator as any)

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <div className="flex flex-col items-center text-center mb-8">
        <ReceiptMark size={90} className="mb-6" />
        <h1 className="font-display text-3xl sm:text-4xl text-ink mb-1">
          {groupName} is ready.
        </h1>
        <p className="text-sm opacity-70">
          Share this invite link so friends can join the group.
        </p>
      </div>

      <div className="rounded-[22px] bg-paper-cream border border-paper-edge p-5 mb-4">
        {loading ? (
          <div className="flex items-center gap-3 text-sm opacity-70">
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating invite link…
          </div>
        ) : error ? (
          <div className="sx-error-text">Couldn&apos;t generate link: {error}</div>
        ) : url ? (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 h-11 px-4 rounded-full border border-[rgba(32,36,43,0.12)] bg-white/60 text-sm font-mono"
              />
              <button
                onClick={copy}
                className="h-11 px-5 rounded-full bg-ink text-paper-cream text-sm font-medium flex items-center gap-1.5"
              >
                {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
              </button>
            </div>

            <div className="flex gap-2 flex-wrap">
              {canNativeShare && (
                <button
                  onClick={nativeShare}
                  className="h-10 px-4 rounded-full bg-[rgba(32,36,43,0.08)] hover:bg-[rgba(32,36,43,0.14)] text-sm flex items-center gap-1.5"
                >
                  <Share2 className="w-4 h-4" /> Share sheet
                </button>
              )}
              <button
                onClick={openMail}
                className="h-10 px-4 rounded-full bg-[rgba(32,36,43,0.08)] hover:bg-[rgba(32,36,43,0.14)] text-sm flex items-center gap-1.5"
              >
                <Mail className="w-4 h-4" /> Email
              </button>
            </div>

            <p className="text-xs opacity-60">
              Valid 14 days. Anyone who opens this can pick their participant
              and join{code ? <> — or they can enter code{' '}
              <span className="font-mono font-bold tracking-[0.14em] text-ink">{code}</span>{' '}
              on the join page</> : null}.
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/groups/${groupId}/members`}
          className="text-sm underline opacity-80 hover:opacity-100"
        >
          Manage members
        </Link>
        <Link
          href={`/groups/${groupId}/expenses`}
          className="h-11 px-5 rounded-full bg-ink text-paper-cream text-sm font-medium flex items-center gap-1.5"
        >
          Continue to group <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </main>
  )
}
