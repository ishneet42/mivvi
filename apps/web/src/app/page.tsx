import { Button } from '@/components/ui/button'
import { ReceiptCard, ReceiptDivider, NumDisplay } from '@/components/receipt-card'
import { ArrowUpRight, Camera, MessageSquareText, Sparkles } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex-1">
      {/* Hero — split layout: copy on the left, product illustration on the right */}
      <section className="px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="max-w-6xl mx-auto grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(26,20,16,0.06)] text-xs font-medium mb-8">
              <Sparkles className="w-3 h-3" />
              AI-native bill splitter
            </div>

            <h1 className="font-display text-[44px] sm:text-[64px] lg:text-[72px] font-medium leading-[1.0] tracking-[-0.025em] mb-6">
              Snap the receipt.
              <br />
              Tell it who got what.
              <br />
              <span className="italic text-[color:var(--sx-muted-foreground,#7A6B56)] opacity-70">
                Done.
              </span>
            </h1>

            <p className="text-[17px] sm:text-[19px] leading-relaxed max-w-xl opacity-80 mb-10">
              AI reads the receipt. You describe the split in plain English —
              &ldquo;Ishi got both pastas, Manny didn&apos;t drink.&rdquo;
              Every expense lands in your group&apos;s ledger instantly.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full h-12 px-6 text-[14px]">
                <Link href="/groups">
                  Start splitting <ArrowUpRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg" className="rounded-full h-12 px-6 text-[14px] bg-[rgba(26,20,16,0.06)] hover:bg-[rgba(26,20,16,0.1)]">
                <Link href="/groups">See my groups</Link>
              </Button>
            </div>
          </div>

          {/* Illustration column. Image sits in apps/web/public/hero_img2.png.
              Floating peach aura behind it matches the warm palette. */}
          <div className="relative flex justify-center lg:justify-end">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 blur-3xl opacity-70"
              style={{
                background:
                  'radial-gradient(60% 60% at 50% 50%, rgba(232, 197, 160, 0.7) 0%, transparent 70%)',
              }}
            />
            <Image
              src="/hero_img2.png"
              alt="Scan a receipt with Mivvi"
              width={560}
              height={560}
              priority
              className="relative w-full max-w-[460px] drop-shadow-[0_24px_60px_rgba(26,20,16,0.18)]"
            />
          </div>
        </div>
      </section>

      {/* Orb + tagline */}
      <section className="px-6 pb-24">
        <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
          <div className="sx-orb mb-10" />
          <p className="text-sm opacity-60 uppercase tracking-[0.2em]">
            Speak or type to split the bill
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-semibold max-w-xl tracking-tight">
            &ldquo;Ishi got both pastas, split the wine three ways, Manny
            didn&apos;t drink.&rdquo;
          </p>
        </div>
      </section>

      {/* Three-feature trio — first POC of the receipt-card primitive.
          Each card is a torn slip of paper with perforated top + bottom
          edges (CSS mask), Fraunces display headers, and a JetBrains Mono
          "amount" line at the bottom that hints at the receipt format. */}
      <section className="px-6 pb-28">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-6">
          <ReceiptCard>
            <FeatureBody
              step="01"
              icon={<Camera className="w-5 h-5" />}
              title="Snap"
              body="Take a photo of any receipt. The parser extracts line items, prices, tax, and tip in under two seconds."
              meta="Avg parse"
              metaValue={2}  // 2-something seconds
              metaUnit="s"
            />
          </ReceiptCard>
          <ReceiptCard>
            <FeatureBody
              step="02"
              icon={<MessageSquareText className="w-5 h-5" />}
              title="Talk"
              body="Tell the agent what happened in plain English. It assigns items, handles weights, and asks when it's unsure."
              meta="Tools called"
              metaValue={9}
              metaUnit=""
            />
          </ReceiptCard>
          <ReceiptCard variant="success">
            <FeatureBody
              step="03"
              icon={<Sparkles className="w-5 h-5" />}
              title="Settle"
              body="One tap to finalize. Balances update across your group instantly — ready to settle up whenever."
              meta="Status"
              metaValue={null}
              metaUnit="paid"
            />
          </ReceiptCard>
        </div>
      </section>
    </main>
  )
}

// FeatureBody renders the inner anatomy of a receipt-style feature card:
// step number tag, icon, headline (Fraunces), body, dashed divider, and
// a faux "summary" line in mono that reinforces the receipt metaphor.
function FeatureBody({
  step,
  icon,
  title,
  body,
  meta,
  metaValue,
  metaUnit,
}: {
  step: string
  icon: React.ReactNode
  title: string
  body: string
  meta: string
  metaValue: number | null
  metaUnit: string
}) {
  return (
    <>
      <div className="flex items-start justify-between mb-4">
        <div className="w-9 h-9 rounded-xl bg-ink text-paper-deep grid place-items-center">
          {icon}
        </div>
        <span className="num-mono text-[10px] tracking-[0.18em] uppercase opacity-50">
          {step}
        </span>
      </div>
      <h3 className="font-display text-2xl mb-2 leading-tight">{title}</h3>
      <p className="text-sm opacity-70 leading-relaxed">{body}</p>
      <ReceiptDivider />
      <div className="flex items-end justify-between">
        <span className="text-[11px] uppercase tracking-[0.15em] opacity-50">
          {meta}
        </span>
        <span className="num-mono text-base font-medium">
          {metaValue !== null ? metaValue : '—'}
          {metaUnit}
        </span>
      </div>
    </>
  )
}
