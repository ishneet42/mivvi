'use client'

// Mivvi: <ReceiptCard /> — the brand primitive.
//
// A torn slip of paper. Perforated top + bottom edges (CSS mask-image),
// faint cream/paper background, optional accent tint for settled / owe
// states. Pairs with <ReceiptDivider /> for in-card section breaks and
// <NumDisplay /> for monospace amounts.
//
// See DESIGN.md §7 for the full anatomy spec.
import { motion, type HTMLMotionProps } from 'framer-motion'
import { type ReactNode, forwardRef } from 'react'

type Variant = 'default' | 'success' | 'owe' | 'minimal'

const VARIANT_BG: Record<Variant, string> = {
  default: 'bg-paper-cream',
  success: 'bg-paper-cream',
  owe:     'bg-paper-cream',
  minimal: 'bg-transparent',
}

// Top accent stripe — thin coloured band that gives the card a "type" tag
// without taking real estate. None on minimal/default.
const VARIANT_STRIPE: Record<Variant, string | null> = {
  default: null,
  success: 'bg-acid',
  owe:     'bg-clay',
  minimal: null,
}

type Props = HTMLMotionProps<'div'> & {
  variant?: Variant
  /** Which edges get the perforated scallop. Default both. */
  perforation?: 'both' | 'top' | 'bottom' | 'none'
  /** Disable the mount animation if used in a static context (e.g. SSR
   *  list inside an already-animated parent). */
  noAnimate?: boolean
  children: ReactNode
}

const PERF_CLASS: Record<NonNullable<Props['perforation']>, string> = {
  both:   'receipt-perf',
  top:    'receipt-perf-top',
  bottom: 'receipt-perf-bottom',
  none:   '',
}

export const ReceiptCard = forwardRef<HTMLDivElement, Props>(function ReceiptCard(
  {
    variant = 'default',
    perforation = 'both',
    noAnimate = false,
    className = '',
    children,
    ...rest
  },
  ref,
) {
  const stripe = VARIANT_STRIPE[variant]

  return (
    <motion.div
      ref={ref}
      initial={noAnimate ? false : { opacity: 0, y: 8 }}
      animate={noAnimate ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      whileHover={{ y: -2 }}
      className={[
        'relative',
        VARIANT_BG[variant],
        PERF_CLASS[perforation],
        'shadow-paper-lift',
        // Padding builds in space for the perforation bites so the
        // content doesn't overlap them.
        'px-6 pt-7 pb-7',
        'transition-shadow duration-200',
        'hover:shadow-paper-pop',
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {/* Variant stripe — runs across the top, just inside the perforation */}
      {stripe && (
        <span
          aria-hidden
          className={`absolute left-6 right-6 top-3 h-[2px] ${stripe}`}
        />
      )}
      {children}
    </motion.div>
  )
})

// Torn-paper divider — dashed line for section breaks inside a receipt.
// Use between header/body or body/footer.
export function ReceiptDivider({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`my-4 ${className}`}
      style={{
        height: '1px',
        backgroundImage:
          'repeating-linear-gradient(to right, rgba(26,20,16,0.2) 0 4px, transparent 4px 8px)',
        backgroundSize: '8px 1px',
        backgroundRepeat: 'repeat-x',
      }}
    />
  )
}

// Monospace number with optional count-up animation. Use for prices,
// balances, totals — anywhere a receipt would have figures.
type NumDisplayProps = {
  /** Value in CENTS (mirrors the rest of the codebase). */
  value: number
  size?: 'lg' | 'md' | 'sm'
  variant?: 'default' | 'positive' | 'negative'
  prefix?: string  // currency symbol; defaults to "$"
  className?: string
}

const NUM_SIZE: Record<NonNullable<NumDisplayProps['size']>, string> = {
  lg: 'text-5xl sm:text-6xl font-semibold leading-none',
  md: 'text-2xl font-semibold leading-tight',
  sm: 'text-sm font-medium leading-tight',
}

const NUM_VARIANT: Record<NonNullable<NumDisplayProps['variant']>, string> = {
  default:  'text-ink',
  positive: 'text-acid-ink',
  negative: 'text-clay-ink',
}

export function NumDisplay({
  value,
  size = 'md',
  variant = 'default',
  prefix = '$',
  className = '',
}: NumDisplayProps) {
  const dollars = Math.floor(Math.abs(value) / 100).toLocaleString('en-US')
  const cents = (Math.abs(value) % 100).toString().padStart(2, '0')
  const sign = value < 0 ? '-' : ''
  return (
    <span
      className={[
        'num-mono',
        NUM_SIZE[size],
        NUM_VARIANT[variant],
        className,
      ].join(' ')}
    >
      {sign}
      {prefix}
      {dollars}
      <span className="opacity-50">.{cents}</span>
    </span>
  )
}
