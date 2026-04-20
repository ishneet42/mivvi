// GET /api/users/search?q=<query>
// Typeahead for adding friends by @username to a new group.
//
// Returns at most 10 matches, each with only:
//   - clerkUserId (opaque, used to auto-link a participant on submit)
//   - username
//   - displayName
//   - avatarEmoji / avatarPreset
//
// Email + Clerk profile photo are deliberately NOT returned — we don't want
// random signed-in users to enumerate emails by guessing prefixes.
import { NextRequest, NextResponse } from 'next/server'
import { p } from '@/lib/prisma'
import { AuthError, requireUser } from '@/lib/authz'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    await requireUser()
  } catch (e) {
    const err = e as AuthError
    return NextResponse.json({ error: err.message }, { status: err.status ?? 401 })
  }

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().toLowerCase()
  if (q.length < 2) return NextResponse.json({ users: [] })

  const users = await p.userProfile.findMany({
    where: {
      username: { not: null, startsWith: q },
    },
    select: {
      clerkUserId: true,
      username: true,
      displayName: true,
      avatarEmoji: true,
      avatarPreset: true,
    },
    orderBy: { username: 'asc' },
    take: 10,
  })

  return NextResponse.json({ users })
}
