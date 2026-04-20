'use client'

// Mivvi RAG balance assistant UI. Warm editorial aesthetic, streaming answer,
// citation chips that link to the specific expense.
import { useRef, useState } from 'react'
import Link from 'next/link'
import { Sparkles, ArrowUpRight } from 'lucide-react'

type Retrieved = {
  id: string
  title: string
  amount_cents: number
  expenseDate: string
  groupId: string
  groupName: string
  paidByName: string
  paidFor: string[]
  similarity: number | null
}

const EXAMPLES = [
  'How much did I spend on coffee last month?',
  'Who owes me the most right now?',
  'What was the most expensive thing I paid for this year?',
  'Show me every dinner with Ishi',
]

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

// Render text with [id:abc123] citation markers replaced by chip components.
function Answer({ text, retrieved }: { text: string; retrieved: Retrieved[] }) {
  const byId = new Map(retrieved.map((r) => [r.id, r]))
  const parts: Array<{ kind: 'text'; v: string } | { kind: 'cite'; id: string }> = []
  const re = /\[id:([^\]]+)\]/g
  let last = 0, m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ kind: 'text', v: text.slice(last, m.index) })
    parts.push({ kind: 'cite', id: m[1].trim() })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ kind: 'text', v: text.slice(last) })

  return (
    <div className="whitespace-pre-wrap leading-relaxed">
      {parts.map((p, i) => {
        if (p.kind === 'text') return <span key={i}>{p.v}</span>
        const r = byId.get(p.id)
        if (!r) return <span key={i} className="text-xs opacity-50">[?]</span>
        return (
          <Link
            key={i}
            href={`/groups/${r.groupId}/expenses`}
            className="inline-flex items-baseline gap-1 px-2 py-0.5 rounded-full bg-[rgba(26,20,16,0.08)] hover:bg-[rgba(26,20,16,0.14)] text-xs align-baseline mx-0.5"
          >
            <span className="font-medium">{r.title}</span>
            <span className="opacity-60 num">{dollars(r.amount_cents)}</span>
          </Link>
        )
      })}
    </div>
  )
}

export default function AskPage() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [retrieved, setRetrieved] = useState<Retrieved[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function ask(q: string) {
    setBusy(true); setError(null); setAnswer(''); setRetrieved([])
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      if (!res.ok || !res.body) throw new Error(await res.text())
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const metaIdx = buf.indexOf('\n\n__META__')
        if (metaIdx >= 0) {
          setAnswer(buf.slice(0, metaIdx))
          try {
            const meta = JSON.parse(buf.slice(metaIdx + '\n\n__META__'.length)) as { retrieved: Retrieved[] }
            setRetrieved(meta.retrieved)
          } catch { /* partial */ }
        } else {
          setAnswer(buf)
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function backfill() {
    setBackfillMsg('Indexing…')
    try {
      const res = await fetch('/api/ask/backfill', { method: 'POST' })
      const j = (await res.json()) as { embedded?: number; total?: number; error?: string }
      if (!res.ok) throw new Error(j.error ?? 'failed')
      setBackfillMsg(`Indexed ${j.embedded} / ${j.total} expenses.`)
    } catch (e) {
      setBackfillMsg(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(26,20,16,0.06)] text-xs font-medium mb-6">
        <Sparkles className="w-3 h-3" />
        Balance assistant
      </div>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">Ask your expenses.</h1>
      <p className="opacity-70 mb-8 text-[15px] leading-relaxed">
        Retrieval-augmented Q&amp;A over every expense in your groups. Answers cite
        the specific expenses they used so you can verify.
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); if (question.trim()) ask(question.trim()) }}
        className="flex gap-2 mb-3"
      >
        <input
          ref={inputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="How much did I spend on groceries last month?"
          className="flex-1 rounded-full h-12 px-5 border border-[rgba(26,20,16,0.12)] bg-[rgba(255,253,247,0.7)] backdrop-blur-md text-[15px] focus:outline-none focus:border-[rgba(26,20,16,0.4)]"
        />
        <button
          type="submit"
          disabled={busy || !question.trim()}
          className="rounded-full h-12 px-5 bg-[#1A1410] text-[#F4ECDB] font-medium disabled:opacity-40 flex items-center gap-1"
        >
          {busy ? 'Asking…' : <>Ask <ArrowUpRight className="w-4 h-4" /></>}
        </button>
      </form>

      <div className="flex flex-wrap gap-2 mb-10">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => { setQuestion(ex); ask(ex) }}
            className="text-xs px-3 py-1.5 rounded-full bg-[rgba(26,20,16,0.05)] hover:bg-[rgba(26,20,16,0.1)]"
          >
            {ex}
          </button>
        ))}
      </div>

      {error && <div className="mb-6 p-3 rounded-xl bg-[rgba(229,99,78,0.1)] border border-[rgba(229,99,78,0.3)] text-sm">{error}</div>}

      {(answer || busy) && (
        <div className="rounded-[22px] p-6 bg-[rgba(255,253,247,0.7)] backdrop-blur-md border border-[rgba(255,255,255,0.5)] mb-6">
          {busy && !answer && (
            <div className="flex items-center gap-3 text-sm opacity-60">
              <div className="sx-orb" style={{ width: 32, height: 32 }} />
              Searching your expenses…
            </div>
          )}
          {answer && <Answer text={answer} retrieved={retrieved} />}
        </div>
      )}

      {retrieved.length > 0 && (
        <details className="mb-6">
          <summary className="text-xs opacity-60 cursor-pointer">
            {retrieved.length} expense{retrieved.length === 1 ? '' : 's'} considered
          </summary>
          <div className="mt-3 space-y-1">
            {retrieved.map((r) => (
              <div key={r.id} className="flex items-baseline justify-between text-sm py-1 border-b border-[rgba(26,20,16,0.06)]">
                <span className="truncate mr-2">
                  {r.title} · <span className="opacity-60 text-xs">{r.groupName} · {r.expenseDate}</span>
                </span>
                <span className="num tabular-nums font-medium">{dollars(r.amount_cents)}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      <div className="text-xs opacity-60">
        Expenses are indexed automatically when created. If older expenses don't
        show up, <button onClick={backfill} className="underline">rebuild the index</button>.
        {backfillMsg && <div className="mt-1 opacity-80">{backfillMsg}</div>}
      </div>
    </main>
  )
}
