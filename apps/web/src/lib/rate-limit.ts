// Per-user daily rate limits for the LLM-backed endpoints. These exist to
// cap Gemini spend when the app is open to public sign-ups: an abusive (or
// runaway) account gets a 429 instead of an unbounded API bill.
//
// Fixed UTC-day window, one Postgres row per user × route × day. The upsert
// increment is atomic, so concurrent requests can't skip the cap by racing.
// Limits are deliberately generous for real humans splitting bills.
import { p } from '@/lib/prisma'
import { EVAL_USER_ID } from '@/lib/authz'

export class RateLimitError extends Error {
  status = 429
  constructor(route: string, limit: number) {
    super(
      `Daily limit reached for ${route} (${limit}/day). Try again tomorrow.`,
    )
  }
}

export const DAILY_LIMITS = {
  parse: 40, // receipt scans (Gemini vision)
  agent: 200, // chat-agent messages (tool loop)
  ask: 100, // RAG questions
  'ask-backfill': 5, // full re-embeds of a user's expense history
  'voice-token': 50, // Gemini Live session tokens
} as const

export type LimitedRoute = keyof typeof DAILY_LIMITS

/**
 * Count one hit and throw RateLimitError (status 429) once the user is over
 * the day's cap. The eval bot bypasses limits so automated evals keep working.
 */
export async function enforceDailyLimit(userId: string, route: LimitedRoute) {
  if (userId === EVAL_USER_ID) return
  const limit = DAILY_LIMITS[route]
  const day = new Date().toISOString().slice(0, 10)
  const id = `${userId}:${route}:${day}`
  const row = await p.apiUsage.upsert({
    where: { id },
    create: { id, userId, route, day, count: 1 },
    update: { count: { increment: 1 } },
  })
  if (row.count > limit) throw new RateLimitError(route, limit)
}
