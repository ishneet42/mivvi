import { ApplePwaSplash } from '@/app/apple-pwa-splash'
import { LocaleSwitcher } from '@/components/locale-switcher'
import { ProgressBar } from '@/components/progress-bar'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { env } from '@/lib/env'
import { TRPCProvider } from '@/trpc/client'
import { ClerkProvider, Show, SignInButton, SignUpButton } from '@clerk/nextjs'
import { HeaderUserMenu } from '@/components/header-user-menu'
import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider, useTranslations } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { Fraunces, JetBrains_Mono } from 'next/font/google'
import Link from 'next/link'
import { Suspense } from 'react'
import './globals.css'

// Editorial display serif for headings — replaces generic Inter on h1/h2/h3.
// Variable font; we expose the CSS var --font-fraunces so utility classes
// (.font-display) and inline styles can opt in without changing body text.
// We don't list `axes` — Fraunces' custom SOFT/WONK axes aren't all
// supported by next/font/google's allowlist and trigger a build error.
// The default load gives us wght + opsz which is plenty.
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
})

// Receipt-style monospace for prices, balances, item amounts. Tabular
// figures align columns. Exposed as --font-mono.
const jetbrainsMono = JetBrains_Mono({
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

export const viewport: Viewport = { themeColor: '#F4ECDB' }

function Logo({ size = 28 }: { size?: number }) {
  // Unique filter IDs per-render so multiple Logos on one page don't collide.
  const gid = `mv-glow-g-${size}`
  const bid = `mv-glow-b-${size}`
  const ggrad = `mv-green-${size}`
  const bgrad = `mv-blue-${size}`
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label="Mivvi">
      <defs>
        <filter id={gid} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={bid} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id={ggrad} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#BDFFD4" />
          <stop offset="50%" stopColor="#3BFF66" />
          <stop offset="100%" stopColor="#23C14A" />
        </linearGradient>
        <linearGradient id={bgrad} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#C7F2FF" />
          <stop offset="50%" stopColor="#3BD4FF" />
          <stop offset="100%" stopColor="#1E9EDE" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="100" height="100" rx="22" fill="#141410" />
      <path d="M 22 30 L 40 68 L 58 30" stroke="#3BFF66" strokeWidth="14" strokeOpacity="0.18" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M 50 34 L 68 72 L 86 34" stroke="#3BD4FF" strokeWidth="14" strokeOpacity="0.18" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M 50 34 L 68 72 L 86 34" stroke={`url(#${bgrad})`} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={`url(#${bid})`} />
      <path d="M 22 30 L 40 68 L 58 30" stroke={`url(#${ggrad})`} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={`url(#${gid})`} />
      <path d="M 50 34 L 68 72 L 86 34" stroke="#ffffff" strokeWidth="1.6" strokeOpacity="0.85" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M 22 30 L 40 68 L 58 30" stroke="#ffffff" strokeWidth="1.6" strokeOpacity="0.85" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

function Content({ children }: { children: React.ReactNode }) {
  const t = useTranslations()
  return (
    <TRPCProvider>
      <header className="fixed top-0 left-0 right-0 h-14 flex justify-between items-center px-4 z-50 backdrop-blur-md bg-[rgba(244,236,219,0.7)] border-b border-[rgba(26,20,16,0.06)]">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Logo />
          <span className="font-semibold text-[15px] tracking-tight">Mivvi</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Show when="signed-in">
            <Link
              href="/groups"
              className="px-3 py-1.5 rounded-full hover:bg-[rgba(26,20,16,0.06)] transition-colors"
            >
              {t('Header.groups')}
            </Link>
            <Link
              href="/ask"
              className="px-3 py-1.5 rounded-full hover:bg-[rgba(26,20,16,0.06)] transition-colors"
            >
              Ask
            </Link>
            <Link
              href="/profile"
              className="px-3 py-1.5 rounded-full hover:bg-[rgba(26,20,16,0.06)] transition-colors"
            >
              Profile
            </Link>
          </Show>
          <LocaleSwitcher />
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="px-3 py-1.5 rounded-full text-sm hover:bg-[rgba(26,20,16,0.06)] transition-colors">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="px-4 py-1.5 rounded-full text-sm bg-[#1A1410] text-[#F4ECDB] hover:opacity-90 transition-opacity">
                Sign up
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <div className="ml-2">
              <HeaderUserMenu />
            </div>
          </Show>
        </nav>
      </header>

      <div className="pt-14 flex-1 flex flex-col">{children}</div>

      <footer className="mt-24 px-6 py-10 sm:px-16 sm:py-14 text-xs text-[color:var(--sx-ink-soft)] border-t border-[rgba(26,20,16,0.08)]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div className="flex items-center gap-2">
            <Logo size={22} />
            <span className="font-semibold tracking-tight">Mivvi</span>
          </div>
          <div className="opacity-70 leading-relaxed">
            An AI-native bill splitter. Built for people who split meals, not spreadsheets.
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
          colorPrimary: '#1A1410',
          colorBackground: '#F4ECDB',
          colorText: '#1A1410',
          fontFamily: 'Inter, sans-serif',
          borderRadius: '12px',
        },
      }}
    >
      <html
        lang={locale}
        suppressHydrationWarning
        className={`${fraunces.variable} ${jetbrainsMono.variable}`}
      >
        <ApplePwaSplash icon="/icon.svg" color="#F4ECDB" />
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
