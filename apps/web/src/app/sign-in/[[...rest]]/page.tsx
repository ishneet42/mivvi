import { SignIn } from '@clerk/nextjs'
import Link from 'next/link'

export default function SignInPage() {
  return (
    <main className="min-h-[calc(100dvh-3.5rem)] flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full">
        <div className="flex flex-col items-center mb-8">
          <div className="sx-orb mb-8" style={{ width: 120, height: 120 }} />
          <h1 className="text-3xl font-semibold tracking-tight mb-2">Welcome back</h1>
          <p className="text-sm opacity-70 text-center">
            Sign in to Mivvi and pick up where you left off.
          </p>
        </div>

        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/onboarding"
          appearance={{
            variables: {
              colorPrimary: '#20242B',
              colorBackground: '#F8F2E4',
              colorText: '#20242B',
              colorInputBackground: '#FFFFFF',
              colorInputText: '#20242B',
              fontFamily: 'var(--font-hanken), sans-serif',
              borderRadius: '12px',
            },
            elements: {
              rootBox: 'w-full',
              card: 'shadow-none bg-paper-cream border border-paper-edge',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
              formButtonPrimary: 'rounded-full h-11 text-sm font-medium',
              socialButtonsBlockButton: 'rounded-full h-11 border border-[rgba(32,36,43,0.12)] hover:bg-[rgba(32,36,43,0.04)]',
              footerActionLink: 'text-[color:var(--sx-red)] hover:text-[color:var(--sx-red)]',
            },
          }}
        />

        <p className="text-xs text-center opacity-50 mt-6">
          New here? <Link href="/sign-up" className="underline">Create an account</Link>
        </p>
      </div>
    </main>
  )
}
