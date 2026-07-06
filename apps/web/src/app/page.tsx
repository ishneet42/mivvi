import { AppShowcase } from '@/components/landing/app-showcase'
import { HeroReceipt } from '@/components/landing/hero-receipt'
import Link from 'next/link'

/**
 * Landing page — "receipt diner" redesign (see design handoff README).
 * Sections: hero → how it works → the magic → the app (interactive
 * phone) → CTA. Nav + footer live in layout.tsx.
 */
export default function HomePage() {
  return (
    <main className="flex-1">
      {/* ============ HERO ============ */}
      <section
        id="top"
        className="max-w-[1180px] mx-auto px-5 sm:px-10 pt-[clamp(34px,6vw,76px)] pb-[clamp(36px,5vw,64px)] flex flex-wrap gap-[clamp(30px,5vw,56px)] items-center"
      >
        <div className="flex-[1_1_380px] min-w-[300px]">
          <span className="inline-flex items-center gap-2 font-mono text-[11.5px] tracking-[0.16em] text-[#9A6A2E] border-[1.5px] border-dashed border-[#C9A86A] px-3 py-1.5 rounded-[7px] bg-[rgba(245,216,63,0.12)]">
            ★ SPEAK OR TYPE TO SPLIT THE BILL
          </span>
          <h1 className="font-display text-[clamp(46px,8vw,82px)] leading-[0.9] text-ink mt-5 mb-0">
            You talk.
            <br />
            Mivvi does <span className="mv-highlight">the math.</span>
          </h1>
          <p className="text-[clamp(16px,1.5vw,19px)] leading-[1.55] text-ink-soft mt-5 max-w-[440px]">
            Snap the receipt, tell Mivvi who had what in plain words, and
            everyone gets paid back. No spreadsheets, no group-chat math, no
            &ldquo;you still owe me&rdquo; texts.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-7">
            <Link
              href="/groups"
              className="inline-flex items-center gap-[9px] bg-ink text-[#F7F1E3] font-mono font-bold text-[15px] tracking-[0.03em] px-[26px] py-[15px] rounded-[10px] shadow-ticket active:translate-y-0.5 active:shadow-ticket-press transition-[transform,box-shadow]"
            >
              GET MIVVI — FREE
            </Link>
            <a
              href="#app"
              className="inline-flex items-center gap-[9px] text-ink font-bold text-[15px]"
            >
              <span className="w-[30px] h-[30px] rounded-full bg-redpen text-white inline-flex items-center justify-center text-[11px]">
                ▶
              </span>
              See it work
            </a>
          </div>
          <div className="flex items-center gap-[11px] mt-[26px] font-mono text-[12.5px] text-label-soft">
            <span className="text-redpen tracking-[2px] text-[15px]">
              ★★★★★
            </span>
            <span>4.9 — loved by 12,000+ tables</span>
          </div>
        </div>

        <div className="flex-[1_1_360px] min-w-[300px] flex justify-center px-[clamp(30px,7vw,86px)]">
          <HeroReceipt />
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section
        id="how"
        className="max-w-[1180px] mx-auto px-5 sm:px-10 py-[clamp(30px,5vw,64px)]"
      >
        <div className="flex items-end justify-between flex-wrap gap-3.5 mb-[30px]">
          <div>
            <span className="font-mono text-[11.5px] tracking-[0.18em] text-label">
              / 01 — 02 — 03
            </span>
            <h2 className="font-display text-[clamp(32px,4.5vw,52px)] text-ink mt-2 mb-0 leading-[0.95]">
              Three steps,
              <br />
              one receipt.
            </h2>
          </div>
          <p className="font-mono text-[13px] leading-[1.7] text-label-soft max-w-[320px]">
            From photo to &ldquo;paid in full&rdquo; without a single
            calculation. The agent does the boring part.
          </p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-[18px]">
          {/* SNAP */}
          <div className="bg-paper-cream rounded-[14px] px-[22px] pt-[22px] pb-5 shadow-paper-lift border border-[rgba(120,90,40,0.1)]">
            <div className="flex items-center justify-between">
              <span className="w-[46px] h-[46px] rounded-[13px] bg-ink grid place-items-center">
                {/* camera glyph */}
                <span className="relative w-[22px] h-[17px] border-[2.4px] border-highlighter rounded block">
                  <span className="absolute -top-1.5 left-1.5 w-2 h-[5px] bg-ink border-[2.4px] border-highlighter rounded-t-sm" />
                  <span className="absolute top-[3px] left-1.5 w-[7px] h-[7px] rounded-full border-2 border-highlighter" />
                </span>
              </span>
              <span className="font-mono text-[13px] text-[#B6AB90]">01</span>
            </div>
            <h3 className="font-display text-[28px] text-ink mt-[18px] mb-0">
              Snap
            </h3>
            <p className="text-[15px] leading-normal text-ink-soft mt-2">
              Photograph any receipt. Mivvi reads every line item, price, tax
              and tip in under two seconds.
            </p>
            <div className="border-t-2 border-dashed border-[#D3C8AE] mt-[18px] mb-3" />
            <div className="flex justify-between items-baseline font-mono">
              <span className="text-[10.5px] tracking-[0.14em] text-label">
                AVG PARSE
              </span>
              <span className="font-display text-2xl text-ink">2s</span>
            </div>
          </div>

          {/* TALK */}
          <div className="bg-paper-cream rounded-[14px] px-[22px] pt-[22px] pb-5 shadow-paper-lift border border-[rgba(120,90,40,0.1)]">
            <div className="flex items-center justify-between">
              <span className="w-[46px] h-[46px] rounded-[13px] bg-ink grid place-items-center">
                {/* speech-bubble glyph */}
                <span className="relative w-[22px] h-4 bg-highlighter rounded-[5px] block">
                  <span className="absolute -bottom-1 left-1 w-0 h-0 border-l-[5px] border-l-transparent border-t-[6px] border-t-highlighter" />
                </span>
              </span>
              <span className="font-mono text-[13px] text-[#B6AB90]">02</span>
            </div>
            <h3 className="font-display text-[28px] text-ink mt-[18px] mb-0">
              Talk
            </h3>
            <p className="text-[15px] leading-normal text-ink-soft mt-2">
              Say what happened like you&rsquo;d tell a friend. It assigns
              items, handles weights, and asks when it&rsquo;s unsure.
            </p>
            <div className="border-t-2 border-dashed border-[#D3C8AE] mt-[18px] mb-3" />
            <div className="flex justify-between items-baseline font-mono">
              <span className="text-[10.5px] tracking-[0.14em] text-label">
                TOOLS CALLED
              </span>
              <span className="font-display text-2xl text-ink">9</span>
            </div>
          </div>

          {/* SETTLE — dark card */}
          <div className="bg-ink rounded-[14px] px-[22px] pt-[22px] pb-5 shadow-card-dark">
            <div className="flex items-center justify-between">
              <span className="w-[46px] h-[46px] rounded-[13px] bg-highlighter grid place-items-center text-ink text-2xl leading-none">
                ✦
              </span>
              <span className="font-mono text-[13px] text-[#6E6C54]">03</span>
            </div>
            <h3 className="font-display text-[28px] text-[#F7F1E3] mt-[18px] mb-0">
              Settle
            </h3>
            <p className="text-[15px] leading-normal text-[#C7C0AE] mt-2">
              One tap to finalize. Balances update across the group instantly
              — ready to settle up whenever.
            </p>
            <div className="border-t-2 border-dashed border-[#4A4D45] mt-[18px] mb-3" />
            <div className="flex justify-between items-baseline font-mono">
              <span className="text-[10.5px] tracking-[0.14em] text-[#8C8A74]">
                STATUS
              </span>
              <span className="font-display text-2xl text-acid">—PAID</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ THE MAGIC ============ */}
      <section
        id="magic"
        className="max-w-[1180px] mx-auto px-5 sm:px-10 py-[clamp(30px,5vw,72px)]"
      >
        <div className="text-center max-w-[680px] mx-auto mb-10">
          <span className="font-mono text-[11.5px] tracking-[0.18em] text-label">
            THE MAGIC TRICK
          </span>
          <h2 className="font-display text-[clamp(30px,4.6vw,54px)] text-ink mt-2.5 mb-0 leading-[0.96]">
            Say it like you&rsquo;d say it{' '}
            <span className="mv-highlight">to a friend.</span>
          </h2>
          <p className="text-base leading-[1.55] text-ink-soft mt-3.5 mx-auto max-w-[520px]">
            No tapping each item to a person. Just talk. Mivvi figures out the
            messy, real-world stuff.
          </p>
        </div>

        <div className="flex flex-wrap gap-[clamp(20px,3vw,36px)] items-center justify-center">
          {/* YOU SAY */}
          <div className="flex-[1_1_320px] max-w-[430px] min-w-[280px]">
            <div className="font-mono text-[11px] tracking-[0.16em] text-label mb-2.5">
              YOU SAY —
            </div>
            <div className="bg-paper-cream rounded-2xl p-5 shadow-paper-lift border border-[rgba(120,90,40,0.1)]">
              <div className="flex items-center gap-2.5">
                <span className="w-[34px] h-[34px] rounded-full bg-redpen text-white flex items-center justify-center text-[13px] flex-none">
                  ▶
                </span>
                <span className="flex items-center gap-[3px] h-[26px] flex-1">
                  {[9, 18, 24, 13, 21, 8, 16, 23].map((h, i) => (
                    <i
                      key={i}
                      className="block w-[3.5px] rounded-sm bg-ink"
                      style={{ height: h }}
                    />
                  ))}
                  {[11, 17, 7].map((h, i) => (
                    <i
                      key={`m${i}`}
                      className="block w-[3.5px] rounded-sm bg-[#B6AB90]"
                      style={{ height: h }}
                    />
                  ))}
                </span>
                <span className="font-mono text-xs font-bold text-label">
                  0:06
                </span>
              </div>
              <p className="font-hand text-[27px] leading-[1.15] text-ink mt-4 mb-0">
                &ldquo;Ishi got both pastas, split the wine three ways, Manny
                didn&rsquo;t drink.&rdquo;
              </p>
            </div>
          </div>

          <div className="font-display text-[40px] text-redpen rotate-6">
            →
          </div>

          {/* MIVVI SPLITS */}
          <div className="flex-[1_1_320px] max-w-[430px] min-w-[280px]">
            <div className="font-mono text-[11px] tracking-[0.16em] text-label mb-2.5">
              MIVVI SPLITS —
            </div>
            <div className="bg-paper-cream rounded-2xl px-5 pt-5 pb-[22px] shadow-paper-lift border border-[rgba(120,90,40,0.1)]">
              <div className="flex gap-2.5">
                <div className="flex-1 bg-white rounded-[13px] px-[11px] py-[13px] text-center border border-[#EDE3CC]">
                  <div className="w-[38px] h-[38px] rounded-full bg-redpen-avatar text-white font-display text-[15px] grid place-items-center mx-auto">
                    IS
                  </div>
                  <div className="font-extrabold text-[13px] text-ink mt-[7px]">
                    Ishi
                  </div>
                  <div className="font-display text-[22px] text-ink mt-px">
                    $40
                  </div>
                </div>
                <div className="flex-1 bg-white rounded-[13px] px-[11px] py-[13px] text-center border border-[#EDE3CC]">
                  <div className="w-[38px] h-[38px] rounded-full bg-inkblue text-white font-display text-[15px] grid place-items-center mx-auto">
                    MA
                  </div>
                  <div className="font-extrabold text-[13px] text-ink mt-[7px]">
                    Manny
                  </div>
                  <div className="font-display text-[22px] text-ink mt-px">
                    $32
                  </div>
                </div>
                <div className="flex-1 bg-ink rounded-[13px] px-[11px] py-[13px] text-center">
                  <div className="w-[38px] h-[38px] rounded-full bg-acid text-ink font-display text-[15px] grid place-items-center mx-auto">
                    YO
                  </div>
                  <div className="font-extrabold text-[13px] text-[#F7F1E3] mt-[7px]">
                    You
                  </div>
                  <div className="font-display text-[22px] text-acid mt-px">
                    paid
                  </div>
                </div>
              </div>
              <div className="border-t-2 border-dashed border-[#D3C8AE] my-4" />
              <div className="font-mono text-xs text-ink-soft leading-[1.7]">
                <div className="flex justify-between">
                  <span>Pastas ×2 → Ishi</span>
                  <span>$40.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Pizza → Manny + Ishi</span>
                  <span>split</span>
                </div>
                <div className="flex justify-between">
                  <span>Wine → drinkers (2)</span>
                  <span>$16.00 ea</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3.5 bg-[rgba(47,78,120,0.08)] rounded-[10px] px-[11px] py-[9px]">
                <span className="w-[22px] h-[22px] rounded-full flex-none bg-[linear-gradient(135deg,#2F4E78,#D8412A)]" />
                <span className="font-hand text-lg text-inkblue">
                  Manny skipped the wine — adjusted 👍
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ THE APP (interactive phone) ============ */}
      <AppShowcase />

      {/* ============ CTA ============ */}
      <section id="get" className="bg-ink-deep relative z-[2]">
        <div className="max-w-[980px] mx-auto px-5 sm:px-10 py-[clamp(48px,7vw,90px)] text-center">
          <span className="font-mono text-[11.5px] tracking-[0.18em] text-highlighter">
            NO MORE &ldquo;WHO HAD THE WINE?&rdquo;
          </span>
          <h2 className="font-display text-[clamp(38px,7vw,76px)] text-[#F7F1E3] mt-3.5 mb-0 leading-[0.92]">
            Split your first
            <br />
            bill tonight.
          </h2>
          <p className="text-[17px] leading-[1.55] text-[#B7B0A0] mt-[18px] mx-auto max-w-[460px]">
            Free for friends. Snap a receipt, say what happened, and watch
            Mivvi do the math.
          </p>
          <div className="flex flex-wrap gap-3.5 justify-center mt-[30px]">
            <Link
              href="/groups"
              className="inline-flex items-center gap-[9px] bg-highlighter text-ink font-mono font-bold text-[15px] tracking-[0.03em] px-[30px] py-4 rounded-[11px] shadow-ticket-yellow active:translate-y-0.5 active:shadow-ticket-yellow-press transition-[transform,box-shadow]"
            >
              GET MIVVI — FREE
            </Link>
            <a
              href="#app"
              className="inline-flex items-center gap-[9px] bg-transparent text-[#F7F1E3] border-2 border-dashed border-[#5A574A] font-mono font-bold text-[15px] px-[26px] py-4 rounded-[11px]"
            >
              ▶ WATCH THE DEMO
            </a>
          </div>
          <div className="font-mono text-[11.5px] text-[#6E6C5A] mt-[22px]">
            iOS · Android · web — no card, no catch.
          </div>
        </div>
      </section>
    </main>
  )
}
