// GET /api/profile   -> current user's profile (auto-created if missing)
// PUT /api/profile   -> update username / displayName / avatarPreset
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { currentUser } from '@clerk/nextjs/server'
import { p } from '@/lib/prisma'
import { AuthError, requireUser } from '@/lib/authz'
import { validateUsername, AVATAR_PRESETS, isValidEmoji } from '@/lib/avatar'
import { validatePreferences } from '@/lib/preferences'

export const runtime = 'nodejs'

async function loadOrCreate(userId: string) {
  let prof = await p.userProfile.findUnique({ where: { clerkUserId: userId } })
  if (!prof) {
    prof = await p.userProfile.create({
      data: { id: randomUUID(), clerkUserId: userId },
    })
  }
  return prof
}

export async function GET() {
  let userId: string
  try { userId = await requireUser() } catch (e) {
    const err = e as AuthError
    return NextResponse.json({ error: err.message }, { status: err.status ?? 401 })
  }
  const prof = await loadOrCreate(userId)
  const user = await currentUser().catch(() => null)
  return NextResponse.json({
    username:     prof.username,
    displayName:  prof.displayName,
    avatarPreset: prof.avatarPreset,
    avatarEmoji:  prof.avatarEmoji,
    preferences:  validatePreferences(prof.preferences),
    clerkImageUrl: user?.imageUrl ?? null,
    clerkFirstName: user?.firstName ?? null,
    clerkEmail:   user?.primaryEmailAddress?.emailAddress ?? null,
  })
}

export async function PUT(req: NextRequest) {
  let userId: string
  try { userId = await requireUser() } catch (e) {
    const err = e as AuthError
    return NextResponse.json({ error: err.message }, { status: err.status ?? 401 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    username?: string | null
    displayName?: string | null
    avatarPreset?: string | null
    avatarEmoji?: string | null
    preferences?: unknown
  }

  await loadOrCreate(userId) // ensure row exists

  const data: {
    username?: string | null
    displayName?: string | null
    avatarPreset?: string | null
    avatarEmoji?: string | null
    preferences?: string[]
  } = {}

  if (body.username !== undefined) {
    if (body.username === null || body.username === '') {
      data.username = null
    } else {
      const err = validateUsername(body.username)
      if (err) return NextResponse.json({ error: err }, { status: 400 })
      const normalized = body.username.trim().toLowerCase()
      const taken = await p.userProfile.findFirst({
        where: { username: normalized, NOT: { clerkUserId: userId } },
      })
      if (taken) return NextResponse.json({ error: 'Username already taken.' }, { status: 409 })
      data.username = normalized
    }
  }

  if (body.displayName !== undefined) {
    const s = (body.displayName ?? '').trim()
    data.displayName = s.length ? s.slice(0, 50) : null
  }

  if (body.avatarPreset !== undefined) {
    if (body.avatarPreset === null || body.avatarPreset === '') {
      data.avatarPreset = null
    } else if (AVATAR_PRESETS.some((p) => p.id === body.avatarPreset)) {
      data.avatarPreset = body.avatarPreset
    } else {
      return NextResponse.json({ error: 'invalid avatarPreset' }, { status: 400 })
    }
  }

  if (body.avatarEmoji !== undefined) {
    if (body.avatarEmoji === null || body.avatarEmoji === '') {
      data.avatarEmoji = null
    } else if (isValidEmoji(body.avatarEmoji)) {
      data.avatarEmoji = body.avatarEmoji
    } else {
      return NextResponse.json({ error: 'invalid avatarEmoji' }, { status: 400 })
    }
  }

  if (body.preferences !== undefined) {
    data.preferences = validatePreferences(body.preferences)
  }

  const updated = await p.userProfile.update({
    where: { clerkUserId: userId },
    data,
  })
  return NextResponse.json({
    username:     updated.username,
    displayName:  updated.displayName,
    avatarPreset: updated.avatarPreset,
    avatarEmoji:  updated.avatarEmoji,
    preferences:  validatePreferences(updated.preferences),
  })
}
