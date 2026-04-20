'use client'

import { useMemo, useState } from 'react'
import { Check, Dices, Loader2, X } from 'lucide-react'
import { Avatar } from '@/components/avatar'
import { EMOJI_POOL, randomEmoji, validateUsername } from '@/lib/avatar'
import { PREFERENCE_TAGS } from '@/lib/preferences'

export function ProfileClient({
  initialUsername, initialDisplayName, initialAvatarPreset, initialAvatarEmoji,
  initialPreferences,
  clerkImageUrl, clerkFirstName, clerkEmail,
}: {
  initialUsername: string
  initialDisplayName: string
  initialAvatarPreset: string | null
  initialAvatarEmoji: string | null
  initialPreferences: string[]
  clerkImageUrl: string | null
  clerkFirstName: string | null
  clerkEmail: string | null
}) {
  const [preferences, setPreferences] = useState<string[]>(initialPreferences)
  const [username, setUsername] = useState(initialUsername)
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [emoji, setEmoji] = useState<string | null>(
    initialAvatarEmoji ?? (clerkImageUrl || initialAvatarPreset ? null : randomEmoji()),
  )
  const [useClerkPhoto, setUseClerkPhoto] = useState(
    !!clerkImageUrl && !initialAvatarEmoji && !initialAvatarPreset,
  )
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nameForAvatar = displayName || clerkFirstName || username || clerkEmail?.split('@')[0] || 'You'

  const usernameError = useMemo(() => {
    if (!username) return null
    return validateUsername(username)
  }, [username])

  function pickEmoji(e: string) {
    setEmoji(e)
    setUseClerkPhoto(false)
  }

  function randomize() {
    setEmoji(randomEmoji(emoji))
    setUseClerkPhoto(false)
  }

  async function save() {
    if (usernameError) { setError(usernameError); return }
    setBusy(true); setError(null); setSaved(false)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          username: username || null,
          displayName: displayName || null,
          avatarEmoji: useClerkPhoto ? null : emoji,
          avatarPreset: null, // emoji+gradient is the new canonical; legacy preset cleared
          preferences,
        }),
      })
      const j = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(j.error ?? 'failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">Your profile</h1>
        <p className="text-sm opacity-60 mt-1">Shown to friends in groups, on expenses, and in the receipt splitter.</p>
      </header>

      {/* Preview */}
      <div className="rounded-[22px] bg-[rgba(255,253,247,0.7)] backdrop-blur-md border border-[rgba(255,255,255,0.5)] p-6 mb-8 flex items-center gap-5">
        <Avatar
          size={80}
          name={nameForAvatar}
          clerkImageUrl={useClerkPhoto ? clerkImageUrl : null}
          emoji={useClerkPhoto ? null : emoji}
          seed={clerkEmail ?? username}
        />
        <div className="min-w-0 flex-1">
          <div className="text-xl font-semibold tracking-tight truncate">
            {displayName || clerkFirstName || 'Member'}
          </div>
          {username ? (
            <div className="text-sm opacity-60 truncate">@{username}</div>
          ) : (
            <div className="text-sm opacity-40">Set a username below</div>
          )}
          {clerkEmail && <div className="text-xs opacity-40 truncate mt-0.5">{clerkEmail}</div>}
        </div>
      </div>

      {/* Avatar picker */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium opacity-70">Your emoji</h2>
          <button
            onClick={randomize}
            className="h-8 px-3 rounded-full bg-[rgba(26,20,16,0.08)] hover:bg-[rgba(26,20,16,0.14)] text-xs font-medium flex items-center gap-1.5 transition"
            aria-label="Pick a random emoji"
          >
            <Dices className="w-3.5 h-3.5" />
            Random
          </button>
        </div>

        <div className="rounded-[18px] bg-[rgba(255,253,247,0.7)] backdrop-blur-md border border-[rgba(255,255,255,0.5)] p-5">
          {/* Scroll container: shows ~5 rows, rest scrolls. Fade at the bottom
              hints that there's more below. Custom scrollbar matches palette. */}
          <div className="relative">
            <div
              className="max-h-[308px] overflow-y-auto pr-1 -mr-1 emoji-scroll"
              style={{ scrollbarGutter: 'stable' }}
            >
              <div className="grid grid-cols-6 gap-2 pb-4">
                {EMOJI_POOL.map((e) => {
                  const selected = !useClerkPhoto && emoji === e
                  return (
                    <button
                      key={e}
                      onClick={() => pickEmoji(e)}
                      className={
                        'aspect-square rounded-full flex items-center justify-center text-2xl transition-all ' +
                        (selected
                          ? 'bg-[#1A1410] scale-105 ring-2 ring-[#1A1410] ring-offset-2 ring-offset-[rgba(255,253,247,0.7)]'
                          : 'bg-[rgba(26,20,16,0.04)] hover:bg-[rgba(26,20,16,0.10)]')
                      }
                      aria-label={`Use ${e}`}
                    >
                      {e}
                    </button>
                  )
                })}
              </div>
            </div>
            {/* Bottom fade — visible cue that the list scrolls */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-0 right-2 bottom-0 h-8"
              style={{
                background:
                  'linear-gradient(to bottom, rgba(255,253,247,0) 0%, rgba(255,253,247,0.85) 100%)',
              }}
            />
          </div>

          <style>{`
            .emoji-scroll::-webkit-scrollbar { width: 6px; }
            .emoji-scroll::-webkit-scrollbar-track { background: transparent; }
            .emoji-scroll::-webkit-scrollbar-thumb {
              background: rgba(26,20,16,0.18);
              border-radius: 999px;
            }
            .emoji-scroll::-webkit-scrollbar-thumb:hover { background: rgba(26,20,16,0.3); }
            .emoji-scroll {
              scrollbar-width: thin;
              scrollbar-color: rgba(26,20,16,0.18) transparent;
            }
          `}</style>

          {clerkImageUrl && (
            <button
              onClick={() => setUseClerkPhoto(true)}
              className={
                'flex items-center gap-3 px-3 py-2 rounded-xl w-full text-left transition border-t pt-4 mt-3 border-[rgba(26,20,16,0.06)] ' +
                (useClerkPhoto ? 'bg-[rgba(203,212,188,0.5)]' : 'hover:bg-[rgba(26,20,16,0.04)]')
              }
            >
              <Avatar size={36} name={nameForAvatar} clerkImageUrl={clerkImageUrl} />
              <div className="flex-1 text-sm">
                <div className="font-medium">Use your Google photo instead</div>
                <div className="text-xs opacity-60">From your signed-in account</div>
              </div>
              {useClerkPhoto && <Check className="w-4 h-4" />}
            </button>
          )}
        </div>
      </section>

      {/* Display name */}
      <section className="mb-6">
        <h2 className="text-sm font-medium opacity-70 mb-3">Display name</h2>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={clerkFirstName ?? 'Your name'}
          maxLength={50}
          className="w-full h-11 px-4 rounded-full border border-[rgba(26,20,16,0.12)] bg-white/60 text-[15px] focus:outline-none focus:border-[rgba(26,20,16,0.4)]"
        />
      </section>

      {/* Preferences */}
      <section className="mb-6">
        <h2 className="text-sm font-medium opacity-70 mb-3">Preferences</h2>
        <div className="rounded-[18px] bg-[rgba(255,253,247,0.7)] backdrop-blur-md border border-[rgba(255,255,255,0.5)] p-5">
          <p className="text-xs opacity-60 mb-4">
            Mivvi's AI will automatically exclude you from matching items when splitting receipts.
            Group members can still override with explicit commands.
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {PREFERENCE_TAGS.map((tag) => {
              const selected = preferences.includes(tag.id)
              return (
                <label
                  key={tag.id}
                  className={
                    'flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition ' +
                    (selected
                      ? 'bg-[rgba(203,212,188,0.5)] border border-[rgba(120,140,90,0.3)]'
                      : 'bg-[rgba(26,20,16,0.03)] border border-transparent hover:bg-[rgba(26,20,16,0.06)]')
                  }
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(e) => {
                      if (e.target.checked) setPreferences([...preferences, tag.id])
                      else setPreferences(preferences.filter((p) => p !== tag.id))
                    }}
                    className="mt-0.5 accent-[#1A1410]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{tag.label}</div>
                    <div className="text-xs opacity-60">{tag.description}</div>
                  </div>
                </label>
              )
            })}
          </div>
        </div>
      </section>

      {/* Username */}
      <section className="mb-8">
        <h2 className="text-sm font-medium opacity-70 mb-3">Username</h2>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] opacity-50">@</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            placeholder="ishneet"
            maxLength={20}
            className="w-full h-11 pl-8 pr-4 rounded-full border border-[rgba(26,20,16,0.12)] bg-white/60 text-[15px] focus:outline-none focus:border-[rgba(26,20,16,0.4)]"
          />
        </div>
        {usernameError && <div className="text-xs text-[#8A3A28] mt-2">{usernameError}</div>}
        {!usernameError && username && <div className="text-xs opacity-50 mt-2">Looks good.</div>}
        <div className="text-xs opacity-50 mt-2">3–20 chars · lowercase, digits, underscore. Leave blank for no username.</div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={busy || !!usernameError}
          className="h-11 px-6 rounded-full bg-[#1A1410] text-[#F4ECDB] font-medium disabled:opacity-40 flex items-center gap-2"
        >
          {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save profile'}
        </button>
        {saved && <span className="text-sm text-[#2C3A1F] flex items-center gap-1"><Check className="w-4 h-4" /> Saved</span>}
        {error && <span className="text-sm text-[#8A3A28] flex items-center gap-1"><X className="w-4 h-4" /> {error}</span>}
      </div>
    </main>
  )
}
