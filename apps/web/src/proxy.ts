// Mivvi: Clerk auth gate. Runs on every request and redirects
// unauthenticated users to /sign-in. The public routes list controls what
// stays open to the world (sign-in/up pages + the Next.js static/assets
// matcher below).
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',                // marketing landing page is public
  '/sign-in(.*)',
  '/sign-up(.*)',
  // Eval endpoints + the routes they call are gated by X-Eval-Token in-app,
  // so we skip the Clerk middleware's session requirement here.
  '/api/eval/(.*)',
  '/api/agent',
  '/api/receipts/(.*)',
  '/api/parse',
  // Invite previews run the preview GET pre-auth so the user can see what they're accepting.
  '/api/invites/(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
