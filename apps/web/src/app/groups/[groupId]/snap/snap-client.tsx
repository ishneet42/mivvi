'use client'

// Mivvi: "Fin Dzen"-inspired editorial AI finance UI.
// Warm cream / peach / sage palette, dark floating island for the avatar picker
// and agent chat, dotted-sphere orb while the parser or agent is working.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Camera } from 'lucide-react'
import './snap.css'

type Participant = { id: string; name: string }
type ItemRow = {
  id: string
  name: string
  qty: number
  unitPrice: number
  lineTotal: number
  parsedConfidence: number
  assignedTo: string[]
}

type Props = {
  groupId: string
  groupName: string
  currency: string
  participants: Participant[]
}

// Split a "$14,857.05"-style price into main + cents for the Fin Dzen-style
// de-emphasized decimal (the cents render muted).
function priceParts(cents: number, currency: string) {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const main = Math.floor(abs / 100).toLocaleString('en-US')
  const dec = (abs % 100).toString().padStart(2, '0')
  return { sign, currency, main, dec }
}

function Price({ cents, currency }: { cents: number; currency: string }) {
  const p = priceParts(cents, currency)
  return (
    <span className="sx-item-price">
      {p.sign}{p.currency}{p.main}<span className="sx-item-cents">.{p.dec}</span>
    </span>
  )
}

function BigNum({ cents, currency }: { cents: number; currency: string }) {
  const p = priceParts(cents, currency)
  return (
    <div className="sx-bignum">
      {p.sign}{p.currency}{p.main}<span className="dec">.{p.dec}</span>
    </div>
  )
}

export function SnapClient({ groupId, groupName, currency, participants }: Props) {
  const searchParams = useSearchParams()
  const handedOffReceiptId = searchParams.get('receiptId')
  // Voice narration captured on the scan page arrives as a URL param. When
  // present, we auto-open the chat panel, pre-populate it, and fire the
  // assignment agent — so the user's "Ishi got the pastas" becomes a split
  // without ever tapping the chat button.
  const handedOffNarration = searchParams.get('narrate')

  const [phase, setPhase] = useState<'upload' | 'assign' | 'done'>(handedOffReceiptId ? 'assign' : 'upload')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [receiptId, setReceiptId] = useState<string | null>(handedOffReceiptId)
  const [items, setItems] = useState<ItemRow[]>([])
  const [activePicks, setActivePicks] = useState<Set<string>>(new Set())
  const [absent, setAbsent] = useState<Set<string>>(new Set())
  const [payerId, setPayerId] = useState<string>(participants[0]?.id ?? '')

  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatLog, setChatLog] = useState<{ role: 'user' | 'assistant'; text: string }[]>([])
  const [agentBusy, setAgentBusy] = useState(false)

  const [finalExpenseId, setFinalExpenseId] = useState<string | null>(null)

  // Track whether we've already auto-invoked the agent for the incoming
  // narration, so a re-render (state update) doesn't fire it twice.
  const autoAgentFiredRef = useRef(false)
  // ── Load handed-off receipt (from /scan) ─────────────────────
  useEffect(() => {
    if (!handedOffReceiptId) return
    setLoading(true)
    fetch(`/api/receipts/${handedOffReceiptId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text())
        return r.json() as Promise<{
          items: { id: string; name: string; qty: number; unitPrice: number; lineTotal: number; parsedConfidence: number; assignedTo: string[] }[]
        }>
      })
      .then((data) => { setItems(data.items) })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [handedOffReceiptId])

  // ── Auto-invoke agent when narration was captured on /scan ───
  // Fires once, after items are loaded, opens the chat panel so the user sees
  // the streaming reply. Gated by a ref so a state update doesn't re-trigger.
  useEffect(() => {
    if (!handedOffNarration || !receiptId || items.length === 0) return
    if (autoAgentFiredRef.current) return
    autoAgentFiredRef.current = true
    setChatOpen(true)
    // Small delay so the chat panel animates in before the first chunk lands.
    const t = setTimeout(() => { void sendChat(handedOffNarration) }, 120)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handedOffNarration, receiptId, items.length])

  // ── Parse + persist ───────────────────────────────────────────
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true); setError(null)
    try {
      const fd = new FormData(); fd.append('image', file)
      const parseRes = await fetch('/api/parse', { method: 'POST', body: fd })
      if (!parseRes.ok) throw new Error(await parseRes.text())
      const parsed = await parseRes.json()

      const persistRes = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ groupId, parsed }),
      })
      if (!persistRes.ok) throw new Error(await persistRes.text())
      const persisted = (await persistRes.json()) as {
        receiptId: string
        items: { id: string; name: string; qty: number; unitPrice: number; lineTotal: number; parsedConfidence: number }[]
      }
      setReceiptId(persisted.receiptId)
      setItems(persisted.items.map((it) => ({ ...it, assignedTo: [] })))
      setPhase('assign')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  // ── Tap flow ──────────────────────────────────────────────────
  function toggleActive(pid: string) {
    setActivePicks((prev) => {
      const next = new Set(prev)
      next.has(pid) ? next.delete(pid) : next.add(pid)
      return next
    })
  }
  function toggleAbsent(pid: string) {
    setAbsent((prev) => {
      const next = new Set(prev)
      next.has(pid) ? next.delete(pid) : next.add(pid)
      return next
    })
  }

  async function onItemTap(item: ItemRow) {
    const picks = Array.from(activePicks)
    if (picks.length === 0) {
      setError('Pick someone in the island below first.')
      setTimeout(() => setError(null), 2500)
      return
    }
    const sameSet = item.assignedTo.length === picks.length && picks.every((p) => item.assignedTo.includes(p))
    const nextPicks = sameSet ? [] : picks
    await fetch(`/api/receipts/${receiptId}/assignments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ itemId: item.id, participantIds: nextPicks }),
    })
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, assignedTo: nextPicks } : it)))
  }

  async function splitRest() {
    const ids = participants.filter((p) => !absent.has(p.id)).map((p) => p.id)
    const next: ItemRow[] = []
    for (const it of items) {
      if (it.assignedTo.length > 0) { next.push(it); continue }
      await fetch(`/api/receipts/${receiptId}/assignments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ itemId: it.id, participantIds: ids }),
      })
      next.push({ ...it, assignedTo: ids })
    }
    setItems(next)
  }

  async function finalize() {
    setLoading(true)
    try {
      const res = await fetch(`/api/receipts/${receiptId}/finalize`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ groupId, payerId }),
      })
      const json = (await res.json()) as { ok: boolean; error?: string; expense_id?: string }
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'finalize failed')
      setFinalExpenseId(json.expense_id ?? null)
      setPhase('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  // ── Agent chat ────────────────────────────────────────────────
  // Accepts an explicit message so the scan→snap voice handoff can fire the
  // agent automatically without going through the input box.
  async function sendChat(override?: string) {
    const message = (override ?? chatInput).trim()
    if (!message || !receiptId) return
    setChatLog((l) => [...l, { role: 'user', text: message }])
    if (override === undefined) setChatInput('')
    setAgentBusy(true)
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ receiptId, groupId, message }),
      })
      if (!res.ok || !res.body) {
        const errText = await res.text()
        setChatLog((l) => [...l, { role: 'assistant', text: `[error: ${errText}]` }])
        return
      }
      setChatLog((l) => [...l, { role: 'assistant', text: '' }])
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = dec.decode(value, { stream: true })
        setChatLog((l) => {
          const copy = [...l]
          copy[copy.length - 1] = { role: 'assistant', text: copy[copy.length - 1].text + chunk }
          return copy
        })
      }
    } finally {
      setAgentBusy(false)
      // Refresh item state from the DB — the agent may have assigned/unassigned
      // items via tool calls and our local state is stale otherwise.
      try {
        const fresh = await fetch(`/api/receipts/${receiptId}`)
        if (fresh.ok) {
          const data = (await fresh.json()) as {
            items: { id: string; assignedTo: string[] }[]
          }
          const map = new Map(data.items.map((it) => [it.id, it.assignedTo]))
          setItems((prev) => prev.map((it) => ({ ...it, assignedTo: map.get(it.id) ?? it.assignedTo })))
        }
      } catch { /* non-fatal */ }
    }
  }

  // ── Derived totals ────────────────────────────────────────────
  const totalsByPerson = useMemo(() => {
    const t: Record<string, number> = {}
    for (const it of items) {
      if (it.assignedTo.length === 0) continue
      const share = it.lineTotal / it.assignedTo.length
      for (const pid of it.assignedTo) t[pid] = (t[pid] ?? 0) + share
    }
    return t
  }, [items])

  const totalAssigned = Object.values(totalsByPerson).reduce((s, v) => s + v, 0)
  const totalReceipt  = items.reduce((s, it) => s + it.lineTotal, 0)
  const unassignedCount = items.filter((it) => it.assignedTo.length === 0).length

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="sx-root">
      <div className="sx-shell">
        <div className="sx-logo">S</div>
        <div className="sx-greet">Hello · {groupName}</div>
        <h1 className="sx-hero">
          Snap a receipt.<br />
          <span className="sx-hero-sub">AI splits it so you don&apos;t have to.</span>
        </h1>

        {error && <div className="sx-error">{error}</div>}

        {phase === 'upload' && (
          <>
            {loading ? (
              <div className="sx-card sx-card-strong">
                <div className="sx-orb-wrap"><div className="sx-orb" /></div>
                <div style={{ textAlign: 'center', color: 'var(--sx-muted)', fontSize: 13 }}>
                  Reading your receipt…
                </div>
              </div>
            ) : (
              <>
                <Link
                  href={`/groups/${groupId}/scan`}
                  className="sx-card"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    textDecoration: 'none', color: 'inherit',
                    padding: 20, marginBottom: 12,
                    background: 'var(--sx-ink)',
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: 'var(--sx-red)', color: '#fff',
                    display: 'grid', placeItems: 'center',
                  }}>
                    <Camera className="w-5 h-5" />
                  </div>
                  <div style={{ flex: 1, color: 'var(--sx-cream)' }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>Scan a receipt</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Open the camera and align the receipt in the frame.</div>
                  </div>
                  <div style={{ color: 'var(--sx-cream)', opacity: 0.7 }}>→</div>
                </Link>
                <label className="sx-drop sx-card" style={{ cursor: 'pointer', display: 'block' }}>
                  <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Or upload from gallery</div>
                  <div style={{ fontSize: 12, color: 'var(--sx-muted)' }}>
                    Pick a photo you&apos;ve already taken.
                  </div>
                  <input type="file" accept="image/*" onChange={onFile} className="sx-file-input" />
                </label>
              </>
            )}
          </>
        )}

        {phase === 'assign' && (
          <>
            {/* Items */}
            <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
              {items.map((it) => {
                const lowConf = it.parsedConfidence < 0.6
                const isAssigned = it.assignedTo.length > 0
                return (
                  <button
                    key={it.id}
                    onClick={() => onItemTap(it)}
                    className={`sx-item${isAssigned ? ' assigned' : ''}${lowConf ? ' low-conf' : ''}`}
                  >
                    <div>
                      <div className="sx-item-name">{it.name}</div>
                      <div className="sx-item-meta">
                        {it.qty}× <Price cents={it.unitPrice} currency={currency} />
                        {lowConf && <span style={{ marginLeft: 8, color: 'var(--sx-red)' }}>verify</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {it.assignedTo.length > 0 && (
                        <div className="sx-avstack">
                          {it.assignedTo.map((pid) => {
                            const p = participants.find((x) => x.id === pid)
                            return <span key={pid} className="sx-avchip">{p?.name.slice(0, 1).toUpperCase()}</span>
                          })}
                        </div>
                      )}
                      <Price cents={it.lineTotal} currency={currency} />
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Totals */}
            <div className="sx-card">
              <div className="sx-totals-head">
                <span style={{ fontWeight: 500 }}>Running totals</span>
                {unassignedCount > 0 ? (
                  <button onClick={splitRest} className="sx-link">
                    Split remaining {unassignedCount} evenly
                  </button>
                ) : (
                  <span className="sx-chip-sage">All assigned</span>
                )}
              </div>
              {participants.map((p) => (
                <div key={p.id} className={`sx-totals-row${absent.has(p.id) ? ' absent' : ''}`}>
                  <span>{p.name}</span>
                  <Price cents={Math.round(totalsByPerson[p.id] ?? 0)} currency={currency} />
                </div>
              ))}
              <div className="sx-totals-row summary">
                <span>Assigned</span>
                <span>
                  <Price cents={Math.round(totalAssigned)} currency={currency} />
                  {' / '}
                  <Price cents={totalReceipt} currency={currency} />
                </span>
              </div>
            </div>

            {/* Finalize */}
            <div className="sx-card" style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
              <label style={{ flex: 1, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--sx-muted)' }}>Paid by</span>
                <select
                  value={payerId}
                  onChange={(e) => setPayerId(e.target.value)}
                  style={{
                    background: 'transparent', border: 'none',
                    fontFamily: 'inherit', fontSize: 14, fontWeight: 500,
                    color: 'var(--sx-ink)', cursor: 'pointer',
                  }}
                >
                  {participants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <button
                onClick={finalize}
                disabled={unassignedCount > 0 || loading}
                className="sx-btn-ink"
              >
                {loading ? 'Saving…' : 'Finalize  →'}
              </button>
            </div>
          </>
        )}

        {phase === 'done' && (
          <div className="sx-card sx-done">
            <div className="sx-done-tick">✓</div>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>Added to {groupName}</div>
            <div style={{ fontSize: 13, color: 'var(--sx-muted)', marginBottom: 20 }}>
              Expense {finalExpenseId?.slice(0, 8)}… saved. Balances updated.
            </div>
            <a href={`/groups/${groupId}/expenses`} className="sx-btn-ink" style={{ display: 'inline-block', textDecoration: 'none' }}>
              View group expenses
            </a>
          </div>
        )}
      </div>

      {/* Floating island with avatars + chat */}
      {phase === 'assign' && (
        <div className="sx-island">
          {chatOpen && (
            <div className="sx-chat">
              {agentBusy && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 16px' }}>
                  <div className="sx-orb" style={{ width: 80, height: 80 }} />
                </div>
              )}
              <div className="sx-chat-log">
                {chatLog.length === 0 && !agentBusy && (
                  <div style={{ color: 'rgba(255,253,247,0.45)' }}>
                    Try: &ldquo;Ishi got both pastas&rdquo; or &ldquo;split the wine 3 ways excluding Manny&rdquo;
                  </div>
                )}
                {chatLog.map((m, i) => (
                  <div key={i} className={`sx-chat-msg ${m.role === 'user' ? 'user' : 'bot'}`}>{m.text}</div>
                ))}
              </div>
              <form className="sx-chat-form" onSubmit={(e) => { e.preventDefault(); sendChat() }}>
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Tell the agent what to do…"
                  className="sx-chat-input"
                />
                <button className="sx-chat-send">Send</button>
              </form>
            </div>
          )}
          <div className="sx-island-row">
            {participants.map((p) => {
              const picked = activePicks.has(p.id)
              const isAbsent = absent.has(p.id)
              return (
                <button
                  key={p.id}
                  onClick={() => toggleActive(p.id)}
                  onContextMenu={(e) => { e.preventDefault(); toggleAbsent(p.id) }}
                  className="sx-ava-btn"
                  title="Right-click to toggle absent"
                >
                  <span className={`sx-ava${picked ? ' picked' : ''}${isAbsent ? ' absent' : ''}`}>
                    {p.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="sx-ava-name">{p.name}</span>
                </button>
              )
            })}
            <button
              onClick={() => setChatOpen((v) => !v)}
              className="sx-ava-btn"
              style={{ marginLeft: 'auto' }}
              aria-label={chatOpen ? 'Hide chat' : 'Open AI chat'}
            >
              <span className="sx-btn-red-dot" style={{ width: 42, height: 42, borderWidth: 3 }} />
              <span className="sx-ava-name">{chatOpen ? 'Close' : 'Ask AI'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
