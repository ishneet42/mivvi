// Mivvi avatar primitives. Gradient-filled circular avatars in the warm
// editorial palette, with optional Clerk-hosted profile photo overriding the
// preset. Fallback chain when rendering:
//   1. clerkImageUrl, if present
//   2. user-selected preset, if set
//   3. deterministic preset picked from the user's id

export type AvatarPreset = {
  id: string
  gradient: [string, string]
  textColor: string
  symbol?: string  // optional decorative element; initial letter takes priority
}

// 12 distinct gradient presets tuned to the Fin Dzen warm palette. Each
// chooses two stops so the result feels hand-picked (peach sunrise,
// sage meadow, mocha dusk, etc.) rather than random.
export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'coral-dusk',   gradient: ['#E5634E', '#F4A582'], textColor: '#FFFDF7' },
  { id: 'sage-morning', gradient: ['#B3BEA0', '#E8DEC8'], textColor: '#2C3A1F' },
  { id: 'mocha-stone',  gradient: ['#7A6B56', '#A08670'], textColor: '#F4ECDB' },
  { id: 'peach-glow',   gradient: ['#E8C5A0', '#F4ECDB'], textColor: '#7A3B1F' },
  { id: 'meadow',       gradient: ['#CBD4BC', '#8FA076'], textColor: '#1A2410' },
  { id: 'terracotta',   gradient: ['#C96B4E', '#8A3A28'], textColor: '#F4ECDB' },
  { id: 'clay-cream',   gradient: ['#D9B48A', '#E8DEC8'], textColor: '#3A2818' },
  { id: 'deep-ink',     gradient: ['#1A1410', '#3A3328'], textColor: '#F4ECDB' },
  { id: 'midnight-sage',gradient: ['#2C3A1F', '#5A6B47'], textColor: '#CBD4BC' },
  { id: 'dawn',         gradient: ['#F4ECDB', '#E8C5A0'], textColor: '#7A3B1F' },
  { id: 'saffron',      gradient: ['#D9A04E', '#E5634E'], textColor: '#1A1410' },
  { id: 'olive',        gradient: ['#9EA672', '#4E5A3B'], textColor: '#F4ECDB' },
]

export function presetById(id: string | null | undefined): AvatarPreset {
  if (!id) return AVATAR_PRESETS[0]
  return AVATAR_PRESETS.find((p) => p.id === id) ?? AVATAR_PRESETS[0]
}

// Pick a stable preset from any string. Hash → index.
export function presetForSeed(seed: string | null | undefined): AvatarPreset {
  if (!seed) return AVATAR_PRESETS[0]
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return AVATAR_PRESETS[Math.abs(h) % AVATAR_PRESETS.length]
}

export function initialsFrom(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return (parts[0][0] + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

// Username validator shared between client + server.
export function validateUsername(raw: string): string | null {
  const u = raw.trim().toLowerCase()
  if (!u) return 'Username required.'
  if (u.length < 3) return 'At least 3 characters.'
  if (u.length > 20) return 'At most 20 characters.'
  if (!/^[a-z0-9_]+$/.test(u)) return 'Lowercase letters, digits, underscore only.'
  return null
}

// ─── Emoji avatars ────────────────────────────────────────────────────────
// Curated pool ordered for a 6-wide grid. Food + drinks lead (fits the "split
// the bill" ethos), animals dominate the back half, and the grid ends with
// friendly insects + two warm accents. Friendly bugs only — no spiders /
// flies / mosquitoes / scorpions. Note: Unicode has no dragonfly glyph as of
// writing; closest is 🪰 (plain fly), intentionally omitted.
export const EMOJI_POOL: string[] = [
  // food — mains (row 1)
  '🍕', '🍣', '🥐', '🍰', '🍝', '🍜',
  // food — global (row 2)
  '🌮', '🍔', '🥗', '🥟', '🥘', '🍛',
  // sweets (row 3)
  '🍦', '🧁', '🍩', '🍪', '🥧', '🍫',
  // drinks — classics (row 4, includes 🥃 whiskey)
  '☕', '🍵', '🍷', '🍺', '🥂', '🥃',
  // drinks — bar + mixers (row 5)
  '🧋', '🍹', '🍸', '🍾', '🥛', '🧃',
  // produce (row 6)
  '🍓', '🍇', '🍊', '🥭', '🥥', '🍉',
  // fluffy mammals (row 7)
  '🦊', '🐻', '🐱', '🐶', '🐰', '🐼',
  // more mammals (row 8)
  '🐨', '🦁', '🐯', '🐹', '🦝', '🦥',
  // big mammals (row 9)
  '🦄', '🦓', '🦒', '🐘', '🦘', '🦔',
  // sea life (row 10)
  '🐙', '🐢', '🐳', '🐬', '🐧', '🦦',
  // birds (row 11)
  '🦉', '🦜', '🦢', '🦩', '🦆', '🐥',
  // insects + sparks (row 12)
  '🐝', '🐞', '🦋', '🐛', '🔥', '✨',
]

export function randomEmoji(exclude?: string | null): string {
  const pool = exclude ? EMOJI_POOL.filter((e) => e !== exclude) : EMOJI_POOL
  return pool[Math.floor(Math.random() * pool.length)]
}

export function isValidEmoji(candidate: string): boolean {
  // Allow anything from the curated pool. Rejecting arbitrary text prevents
  // people from setting "A" or "👨‍👩‍👧‍👦" (ZWJ sequences that don't render
  // reliably) as an avatar.
  return EMOJI_POOL.includes(candidate)
}
