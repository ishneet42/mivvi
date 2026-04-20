import { Button } from '@/components/ui/button'
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

            <h1 className="text-[42px] sm:text-[60px] lg:text-[64px] font-semibold leading-[1.02] tracking-[-0.03em] mb-6">
              Snap the receipt.
              <br />
              Tell it who got what.
              <br />
              <span className="text-[color:var(--sx-muted-foreground,#7A6B56)] opacity-70">
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

          {/* Illustration column. Image sits in apps/web/public/hero_image.png.
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
              src="/hero_image.png"
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

      {/* Three-feature bento */}
      <section className="px-6 pb-28">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-4">
          <Feature
            icon={<Camera className="w-5 h-5" />}
            title="Snap"
            body="Take a photo of any receipt. The parser extracts line items, prices, tax, and tip in under two seconds."
          />
          <Feature
            icon={<MessageSquareText className="w-5 h-5" />}
            title="Talk"
            body="Tell the agent what happened in plain English. It assigns items, handles weights, and asks when it's unsure."
          />
          <Feature
            icon={<Sparkles className="w-5 h-5" />}
            title="Settle"
            body="One tap to finalize. Balances update across your group instantly — ready to settle up whenever."
          />
        </div>
      </section>
    </main>
  )
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-[22px] p-6 bg-[rgba(255,253,247,0.6)] backdrop-blur-md border border-[rgba(255,255,255,0.5)]">
      <div className="w-9 h-9 rounded-xl bg-[var(--sx-ink)] text-[var(--sx-cream)] grid place-items-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-1.5">{title}</h3>
      <p className="text-sm opacity-70 leading-relaxed">{body}</p>
    </div>
  )
}
