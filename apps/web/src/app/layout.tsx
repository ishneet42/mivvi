import { ApplePwaSplash } from '@/app/apple-pwa-splash'
import { LocaleSwitcher } from '@/components/locale-switcher'
import { ProgressBar } from '@/components/progress-bar'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { env } from '@/lib/env'
import { TRPCProvider } from '@/trpc/client'
import { ClerkProvider, Show } from '@clerk/nextjs'
import { HeaderUserMenu } from '@/components/header-user-menu'
import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider, useTranslations } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import {
  Anton,
  Caveat,
  Hanken_Grotesk,
  Spline_Sans_Mono,
} from 'next/font/google'
import Link from 'next/link'
import { Suspense } from 'react'
import './globals.css'

// "Receipt diner" type system (see design handoff):
// Anton — display/headlines/big numbers, always uppercase.
const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-anton',
  display: 'swap',
})

// Caveat — handwritten annotations only. Use sparingly.
const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-caveat',
  display: 'swap',
})

// Hanken Grotesk — body copy and paragraphs.
const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
  display: 'swap',
})

// Spline Sans Mono — UI labels, receipt text, monospace numerals, badges.
// Keeps the --font-mono var name so .num-mono and font-mono utilities work.
const splineMono = Spline_Sans_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_BASE_URL),
  title: {
    default: 'Mivvi · Snap a receipt, AI splits the bill',
    template: '%s · Mivvi',
  },
  description:
    'Mivvi is an AI-native bill splitter. Snap a receipt, talk to it, and the agent handles the math.',
  openGraph: {
    title: 'Mivvi · Snap a receipt, AI splits the bill',
    description: 'AI-native bill splitting. Snap a receipt, tap your friends, done.',
    type: 'website',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mivvi · Snap a receipt, AI splits the bill',
    description: 'AI-native bill splitting. Snap a receipt, tap your friends, done.',
  },
  appleWebApp: { capable: true, title: 'Mivvi' },
  applicationName: 'Mivvi',
}

export const viewport: Viewport = { themeColor: '#E8DCC4' }

// Rubber-stamp "M" mark: ink square, highlighter-yellow Anton letter.
// `tone` flips it for dark surfaces (footer): yellow square, ink letter.
function Logo({
  size = 36,
  tone = 'light',
}: {
  size?: number
  tone?: 'light' | 'dark'
}) {
  return (
    <span
      aria-label="Mivvi"
      className="font-display grid place-items-center"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        background: tone === 'light' ? '#20242B' : '#F5D83F',
        color: tone === 'light' ? '#F5D83F' : '#20242B',
        fontSize: Math.round(size * 0.64),
        lineHeight: 1,
      }}
    >
      M
    </span>
  )
}

function Content({ children }: { children: React.ReactNode }) {
  const t = useTranslations()
  return (
    <TRPCProvider>
      <header className="fixed top-0 left-0 right-0 h-14 flex justify-between items-center px-4 sm:px-6 z-50 backdrop-blur-md bg-[rgba(238,226,202,0.82)] border-b-2 border-dashed border-[#CFC0A0]">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <Logo size={34} />
          <span className="font-display text-[22px] text-ink">MIVVI</span>
        </Link>
        <nav className="flex items-center gap-0.5 sm:gap-1 font-mono text-[12.5px] font-semibold tracking-[0.03em]">
          <Show when="signed-in">
            <Link
              href="/groups"
              className="px-2.5 py-1.5 rounded-md text-[#3C3A33] hover:bg-[rgba(32,36,43,0.07)] transition-colors uppercase"
            >
              {t('Header.groups')}
            </Link>
            <Link
              href="/ask"
              className="px-2.5 py-1.5 rounded-md text-[#3C3A33] hover:bg-[rgba(32,36,43,0.07)] transition-colors uppercase"
            >
              Ask
            </Link>
            <Link
              href="/profile"
              className="hidden xs:block px-2.5 py-1.5 rounded-md text-[#3C3A33] hover:bg-[rgba(32,36,43,0.07)] transition-colors uppercase"
            >
              Profile
            </Link>
          </Show>
          <LocaleSwitcher />
          {/* Plain links (not Clerk modal buttons): the dedicated
              /sign-in and /sign-up pages are styled for the redesign,
              and Clerk's modal-mode buttons intermittently crashed the
              page under React 19 dev (Children.only race). */}
          <Show when="signed-out">
            <Link
              href="/sign-in"
              className="px-2.5 py-1.5 rounded-md text-[#3C3A33] hover:bg-[rgba(32,36,43,0.07)] transition-colors whitespace-nowrap"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="ml-1.5 px-4 py-2 rounded-lg bg-ink text-[#F7F1E3] font-bold border-2 border-dashed border-[#6E6C54] hover:translate-y-[1px] transition-transform whitespace-nowrap"
            >
              GET MIVVI
            </Link>
          </Show>
          <Show when="signed-in">
            <div className="ml-2">
              <HeaderUserMenu />
            </div>
          </Show>
        </nav>
      </header>

      {/* No gap before the footer: on the landing page the dark CTA
          section flows straight into the dark footer (per the mockup);
          app screens get their spacing from their own bottom padding. */}
      <div className="pt-14 pb-10 flex-1 flex flex-col [&:has(#get)]:pb-0">
        {children}
      </div>

      <footer className="bg-[#16140F] border-t-2 border-dashed border-[#3A382E] relative z-[2]">
        <div className="max-w-[1180px] mx-auto px-5 sm:px-10 pt-10 sm:pt-12 pb-8">
          <div className="flex flex-wrap justify-between gap-8">
            <div className="max-w-[300px]">
              <div className="flex items-center gap-2.5">
                <Logo size={32} tone="dark" />
                <span className="font-display text-[20px] text-[#F7F1E3]">
                  MIVVI
                </span>
              </div>
              <p className="font-mono text-xs leading-[1.7] text-[#8C8A78] mt-3.5">
                The AI-native way to split a bill. Snap it, say it, settle it.
              </p>
            </div>
            <div className="flex flex-wrap gap-8 sm:gap-14 font-mono text-[13px]">
              <div className="flex flex-col gap-2.5">
                <span className="text-[#6E6C5A] text-[10.5px] tracking-[0.14em]">
                  PRODUCT
                </span>
                <Link href="/#how" className="text-[#C7C0AE] hover:text-[#F7F1E3] transition-colors">
                  How it works
                </Link>
                <Link href="/#magic" className="text-[#C7C0AE] hover:text-[#F7F1E3] transition-colors">
                  The magic
                </Link>
                <Link href="/#app" className="text-[#C7C0AE] hover:text-[#F7F1E3] transition-colors">
                  The app
                </Link>
              </div>
              <div className="flex flex-col gap-2.5">
                <span className="text-[#6E6C5A] text-[10.5px] tracking-[0.14em]">
                  APP
                </span>
                <Link href="/groups" className="text-[#C7C0AE] hover:text-[#F7F1E3] transition-colors">
                  Groups
                </Link>
                <Link href="/ask" className="text-[#C7C0AE] hover:text-[#F7F1E3] transition-colors">
                  Ask
                </Link>
                <Link href="/profile" className="text-[#C7C0AE] hover:text-[#F7F1E3] transition-colors">
                  Profile
                </Link>
              </div>
            </div>
          </div>
          <div className="h-[30px] mt-8 opacity-[0.22] bg-[repeating-linear-gradient(90deg,#F7F1E3_0_2px,transparent_2px_4px,#F7F1E3_4px_5px,transparent_5px_9px)]" />
          <div className="flex flex-wrap justify-between gap-2.5 font-mono text-[11px] text-[#6E6C5A] mt-4">
            <span>© 2026 MIVVI — THANKS FOR SPLITTING.</span>
            <span>SNAP IT · SAY IT · SETTLE IT</span>
          </div>
        </div>
      </footer>
      <Toaster />
    </TRPCProvider>
  )
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#20242B',
          colorBackground: '#F8F2E4',
          colorText: '#20242B',
          fontFamily: "'Hanken Grotesk', sans-serif",
          borderRadius: '12px',
        },
      }}
    >
      <html
        lang={locale}
        suppressHydrationWarning
        className={`${anton.variable} ${caveat.variable} ${hanken.variable} ${splineMono.variable}`}
      >
        <ApplePwaSplash icon="/icon.svg" color="#E8DCC4" />
        <body className="min-h-[100dvh] flex flex-col items-stretch">
          <NextIntlClientProvider messages={messages}>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem={false}
              forcedTheme="light"
              disableTransitionOnChange
            >
              <Suspense>
                <ProgressBar />
              </Suspense>
              <Content>{children}</Content>
            </ThemeProvider>
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
