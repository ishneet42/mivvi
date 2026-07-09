// Mivvi mark: a mini thermal receipt. Replaces the old gradient "orb"
// (user feedback: "this ball UI looks ugly everywhere") with the brand's
// own object — a floating receipt ticket with a perforated bottom edge
// and barcode. `busy` adds the red scan-line sweep for loading states.
export function ReceiptMark({
  size = 96,
  busy = false,
  className,
}: {
  /** Width in px; height derives from it. */
  size?: number
  /** Show the animated scan line (loading/thinking states). */
  busy?: boolean
  className?: string
}) {
  const h = Math.round(size * 1.22)
  return (
    <div
      aria-hidden="true"
      className={'relative animate-mv-float mv-anim ' + (className ?? '')}
      style={{ width: size, height: h, ['--r' as string]: '-6deg' }}
    >
      <div
        className="receipt-perf absolute inset-0 bg-paper-cream border border-paper-edge"
        style={{ borderRadius: Math.round(size * 0.08) }}
      >
        {/* Item lines */}
        <div
          className="absolute left-[14%] right-[14%] flex flex-col"
          style={{ top: '16%', gap: Math.max(2, Math.round(size * 0.055)) }}
        >
          <div className="h-[3px] rounded-full bg-[rgba(32,36,43,0.35)] w-[62%]" />
          <div className="h-[3px] rounded-full bg-[rgba(32,36,43,0.22)] w-[86%]" />
          <div className="h-[3px] rounded-full bg-[rgba(32,36,43,0.22)] w-[74%]" />
          <div className="h-[3px] rounded-full bg-[rgba(32,36,43,0.22)] w-[80%]" />
        </div>
        {/* Dashed divider + total */}
        <div
          className="absolute left-[14%] right-[14%] border-t-2 border-dashed border-[#C9BFA6]"
          style={{ top: '62%' }}
        />
        <div
          className="absolute left-[14%] right-[14%] flex items-center justify-between"
          style={{ top: '68%' }}
        >
          <div className="h-[3px] rounded-full bg-[rgba(32,36,43,0.35)] w-[30%]" />
          <div className="h-[4px] rounded-full bg-redpen w-[24%]" />
        </div>
        {/* Barcode strip */}
        <div
          className="absolute left-[14%] right-[14%] mv-barcode opacity-60"
          style={{ top: '80%', height: '9%' }}
        />
      </div>
      {busy && (
        <div
          className="absolute left-[6%] right-[6%] h-[3px] rounded-full bg-redpen shadow-[0_0_8px_rgba(216,65,42,0.6)] animate-mv-scan"
          style={{ top: '6%' }}
        />
      )}
    </div>
  )
}
