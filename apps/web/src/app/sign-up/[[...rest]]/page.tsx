import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'

export default function SignUpPage() {
  return (
    <main className="min-h-[calc(100dvh-3.5rem)] flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full">
        <div className="flex flex-col items-center mb-8">
          <div className="sx-orb mb-8" style={{ width: 120, height: 120 }} />
          <h1 className="text-3xl font-semibold tracking-tight mb-2">Create your account</h1>
          <p className="text-sm opacity-70 text-center">
            Start splitting bills in seconds. Snap, talk, settle.
          </p>
        </div>

        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/groups"
          appearance={{
            variables: {
              colorPrimary: '#1A1410',
              colorBackground: '#FFFDF7',
              colorText: '#1A1410',
              colorInputBackground: '#FFFDF7',
              colorInputText: '#1A1410',
              fontFamily: 'Inter, sans-serif',
              borderRadius: '12px',
            },
            elements: {
              rootBox: 'w-full',
              card: 'shadow-none bg-[rgba(255,253,247,0.7)] backdrop-blur-md border border-[rgba(255,255,255,0.5)]',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
              formButtonPrimary: 'rounded-full h-11 text-sm font-medium',
              socialButtonsBlockButton: 'rounded-full h-11 border border-[rgba(26,20,16,0.12)] hover:bg-[rgba(26,20,16,0.04)]',
              footerActionLink: 'text-[color:var(--sx-red)] hover:text-[color:var(--sx-red)]',
            },
          }}
        />

        <p className="text-xs text-center opacity-50 mt-6">
          Already have an account? <Link href="/sign-in" className="underline">Sign in</Link>
        </p>
      </div>
    </main>
  )
}
