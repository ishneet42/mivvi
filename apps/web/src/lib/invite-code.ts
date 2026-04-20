// Mivvi: 6-character join codes for group invites.
//
// Alphabet: uppercase letters + digits, minus visually confusable chars
// (I, L, O, 0, 1). 31 chars × 6 positions = ~887M combinations, which is
// plenty given only ~50 active codes live per group at any time.
//
// Display form is "ABC-X7K" (3+3 with a dash). The dash is cosmetic; the
// DB stores the 6 raw chars. normalizeCode() strips whitespace, dashes, and
// upper-cases so the user can type it any way they like.
import { randomInt } from 'crypto'

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
// 31 chars; excludes I, L, O, 0, 1
const CODE_LEN = 6

export function generateCode(): string {
  let out = ''
  for (let i = 0; i < CODE_LEN; i++) {
    out += ALPHABET[randomInt(ALPHABET.length)]
  }
  return out
}

/** Canonicalize user input into the 6-char storage form.
 *  "abc-x7k" → "ABCX7K", "  ABC X7K " → "ABCX7K". Returns null if invalid. */
export function normalizeCode(input: string): string | null {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (cleaned.length !== CODE_LEN) return null
  for (const ch of cleaned) if (!ALPHABET.includes(ch)) return null
  return cleaned
}

/** Display form: "ABCX7K" → "ABC-X7K". Idempotent for already-dashed strings. */
export function formatCode(raw: string): string {
  const n = normalizeCode(raw)
  if (!n) return raw
  return `${n.slice(0, 3)}-${n.slice(3)}`
}
