'use client'

// Mivvi: <ReceiptStream /> — animated thermal-print receipt as the home-page
// "hero loop". Replaces the generic dotted orb with something that's both
// (a) on-brand (a literal receipt), and (b) communicates the product (the
// receipts cycle through demo splits — viewers see Mivvi at work in 5
// seconds without scrolling).
//
// Each line types in like a printer line, one by one. After the receipt
// completes it holds for a moment, then fades out and the next cycles in.
// Three example bills loop indefinitely.
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Line =
  | { kind: 'header';   text: string }
  | { kind: 'sub';      text: string }
  | { kind: 'item';     name: string; amount: string }
  | { kind: 'divider' }
  | { kind: 'total';    label: string; amount: string; bold?: boolean }
  | { kind: 'split';    text: string }

type Script = {
  merchant: string
  meta: string
  lines: Line[]
}

const SCRIPTS: Script[] = [
  {
    merchant: 'BELLA VISTA CAFÉ',
    meta: 'sat · 7:42pm · 4 guests',
    lines: [
      { kind: 'item',  name: '2× Espresso',     amount: '8.00' },
      { kind: 'item',  name: 'Avocado toast',   amount: '14.50' },
      { kind: 'item',  name: 'Bottle of Malbec', amount: '42.00' },
      { kind: 'divider' },
      { kind: 'total', label: 'Subtotal',  amount: '64.50' },
      { kind: 'total', label: 'Tip (18%)', amount: '11.61' },
      { kind: 'total', label: 'TOTAL',     amount: '76.11', bold: true },
      { kind: 'split', text: '→ split 3 ways · $25.37 each' },
    ],
  },
  {
    merchant: 'TARRO · WOOD-FIRED',
    meta: 'fri · 9:15pm · 3 guests',
    lines: [
      { kind: 'item',  name: 'Margherita',     amount: '18.00' },
      { kind: 'item',  name: 'Carbonara',      amount: '22.00' },
      { kind: 'item',  name: 'House red (½ L)', amount: '32.00' },
      { kind: 'divider' },
      { kind: 'total', label: 'TOTAL', amount: '72.00', bold: true },
      { kind: 'split', text: '→ Ishi $40 · Manny $32 (no wine)' },
    ],
  },
  {
    merchant: 'HOUSE OF SUSHI',
    meta: 'sun · 1:08pm · 4 guests',
    lines: [
      { kind: 'item',  name: 'Omakase × 4',  amount: '240.00' },
      { kind: 'item',  name: 'Junmai sake',  amount: '45.00' },
      { kind: 'divider' },
      { kind: 'total', label: 'Subtotal',    amount: '285.00' },
      { kind: 'total', label: 'Tax + tip',   amount: '48.50' },
      { kind: 'total', label: 'TOTAL',       amount: '333.50', bold: true },
      { kind: 'split', text: '→ split 4 ways · $83.38 each' },
    ],
  },
]

// Pacing — tuned so the receipt feels like it's printing in real time
// without making people wait. Each line ~140ms; final hold 2.4s before
// the next receipt swaps in.
const LINE_DELAY_MS = 140
const HOLD_MS = 2400

export function ReceiptStream({ className = '' }: { className?: string }) {
  const [scriptIdx, setScriptIdx] = useState(0)
  const script = SCRIPTS[scriptIdx]

  // Each script's "alive time" = N lines × LINE_DELAY + HOLD. When that
  // elapses, advance to the next script (loops).
  useEffect(() => {
    const lifetime = script.lines.length * LINE_DELAY_MS + HOLD_MS + 300
    const t = setTimeout(() => {
      setScriptIdx((i) => (i + 1) % SCRIPTS.length)
    }, lifetime)
    return () => clearTimeout(t)
  }, [scriptIdx, script.lines.length])

  return (
    <div
      className={`relative w-[280px] sm:w-[320px] mx-auto select-none ${className}`}
      aria-hidden
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={scriptIdx}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          // The receipt itself — paper bg, perforated top + bottom, mono.
          className="receipt-perf bg-paper-cream shadow-paper-pop px-6 py-7 num-mono text-[12px] sm:text-[13px] leading-[1.55] text-ink"
        >
          {/* Header — merchant + meta line. Always visible immediately. */}
          <div className="text-center mb-4">
            <div className="font-semibold tracking-[0.18em] text-[11px] sm:text-[12px]">
              {script.merchant}
            </div>
            <div className="opacity-50 text-[10px] sm:text-[11px] mt-0.5">
              {script.meta}
            </div>
          </div>

          {/* Body lines — print in one at a time. */}
          <div className="space-y-1">
            {script.lines.map((line, i) => (
              <Row key={i} index={i} line={line} />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function Row({ line, index }: { line: Line; index: number }) {
  const delay = index * (LINE_DELAY_MS / 1000)
  const base = {
    initial: { opacity: 0, y: -4 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.18, ease: 'easeOut' as const },
  }

  if (line.kind === 'item') {
    return (
      <motion.div {...base} className="flex justify-between gap-3">
        <span className="truncate">{line.name}</span>
        <span className="opacity-80">{line.amount}</span>
      </motion.div>
    )
  }
  if (line.kind === 'divider') {
    return (
      <motion.div
        {...base}
        className="my-2"
        style={{
          height: '1px',
          backgroundImage:
            'repeating-linear-gradient(to right, rgba(26,20,16,0.35) 0 4px, transparent 4px 8px)',
          backgroundSize: '8px 1px',
          backgroundRepeat: 'repeat-x',
        }}
      />
    )
  }
  if (line.kind === 'total') {
    return (
      <motion.div
        {...base}
        className={`flex justify-between gap-3 ${line.bold ? 'font-semibold' : 'opacity-80'}`}
      >
        <span>{line.label}</span>
        <span>${line.amount}</span>
      </motion.div>
    )
  }
  if (line.kind === 'split') {
    // Acid-green action line — the punchline of the receipt, the bit
    // Mivvi adds on top of the original.
    return (
      <motion.div
        {...base}
        className="mt-3 pt-3 border-t border-dashed border-ink/20 text-acid-ink font-medium text-[11px] sm:text-[12px]"
      >
        {line.text}
      </motion.div>
    )
  }
  return null
}
