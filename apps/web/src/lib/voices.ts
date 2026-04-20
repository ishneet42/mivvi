// Mivvi: Gemini Live prebuilt voices. The set is documented at:
// https://ai.google.dev/gemini-api/docs/live-api#voices

export type GeminiVoice = {
  id: string        // name Gemini expects in speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName
  label: string
  persona: string   // one-line vibe description for the picker UI
}

export const GEMINI_VOICES: readonly GeminiVoice[] = [
  { id: 'Puck',      label: 'Puck',      persona: 'Bright, playful' },
  { id: 'Charon',    label: 'Charon',    persona: 'Deep, measured' },
  { id: 'Kore',      label: 'Kore',      persona: 'Warm, friendly' },
  { id: 'Fenrir',    label: 'Fenrir',    persona: 'Confident, grounded' },
  { id: 'Aoede',     label: 'Aoede',     persona: 'Melodic, smooth' },
  { id: 'Leda',      label: 'Leda',      persona: 'Soft, thoughtful' },
  { id: 'Orus',      label: 'Orus',      persona: 'Clear, professional' },
  { id: 'Zephyr',    label: 'Zephyr',    persona: 'Light, upbeat' },
]

const VOICE_IDS = new Set(GEMINI_VOICES.map((v) => v.id))

export const DEFAULT_VOICE = 'Puck'

export function isValidVoice(id: unknown): id is string {
  return typeof id === 'string' && VOICE_IDS.has(id)
}
