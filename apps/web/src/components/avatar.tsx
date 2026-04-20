// Mivvi Avatar: renders (in priority order):
//   1. Clerk-hosted profile image if caller passes one
//   2. emoji on gradient (if emoji set)
//   3. initials on gradient (preset or deterministic-from-seed)
'use client'

import Image from 'next/image'
import {
  AVATAR_PRESETS,
  initialsFrom,
  presetById,
  presetForSeed,
  type AvatarPreset,
} from '@/lib/avatar'

type Props = {
  size?: number
  name?: string | null
  clerkImageUrl?: string | null
  preset?: string | null
  emoji?: string | null
  seed?: string | null
  className?: string
  ring?: boolean
}

function gradientStyle(p: AvatarPreset): React.CSSProperties {
  return {
    background: `linear-gradient(135deg, ${p.gradient[0]}, ${p.gradient[1]})`,
    color: p.textColor,
  }
}

export function Avatar({ size = 36, name, clerkImageUrl, preset, emoji, seed, className, ring }: Props) {
  // Emoji picks its own gradient deterministically so same emoji = same color
  // everywhere. Explicit preset override still wins when set.
  const seedForColor = emoji ?? seed ?? name ?? ''
  const resolvedPreset: AvatarPreset = preset ? presetById(preset) : presetForSeed(seedForColor)
  const initial = initialsFrom(name)

  return (
    <span
      className={[
        'inline-flex items-center justify-center rounded-full font-semibold shrink-0 overflow-hidden select-none',
        ring ? 'ring-2 ring-[rgba(255,253,247,0.9)]' : '',
        className ?? '',
      ].join(' ')}
      style={{ width: size, height: size, ...gradientStyle(resolvedPreset) }}
      aria-label={name ?? 'avatar'}
    >
      {clerkImageUrl ? (
        <Image
          src={clerkImageUrl}
          alt={name ?? 'avatar'}
          width={size}
          height={size}
          className="object-cover w-full h-full"
          unoptimized
        />
      ) : emoji ? (
        // Emoji is rendered slightly larger than the initial because emoji
        // glyphs read smaller on average.
        <span style={{ fontSize: Math.max(14, size * 0.56), lineHeight: 1 }}>{emoji}</span>
      ) : (
        <span style={{ fontSize: Math.max(10, size * 0.4) }}>{initial}</span>
      )}
    </span>
  )
}

// Picker preview — always a preset, no Clerk photo. Emoji optional.
export function AvatarPresetPreview({
  preset, name, emoji, size = 56, selected,
}: {
  preset: AvatarPreset
  name?: string | null
  emoji?: string | null
  size?: number
  selected?: boolean
}) {
  return (
    <span
      className={[
        'inline-flex items-center justify-center rounded-full font-semibold transition-all',
        selected
          ? 'ring-2 ring-[#1A1410] ring-offset-2 ring-offset-[#F4ECDB] scale-105'
          : 'ring-1 ring-[rgba(26,20,16,0.08)] hover:scale-105',
      ].join(' ')}
      style={{ width: size, height: size, ...gradientStyle(preset) }}
    >
      {emoji ? (
        <span style={{ fontSize: Math.max(14, size * 0.56), lineHeight: 1 }}>{emoji}</span>
      ) : (
        <span style={{ fontSize: Math.max(12, size * 0.4) }}>{initialsFrom(name)}</span>
      )}
    </span>
  )
}

export { AVATAR_PRESETS }
