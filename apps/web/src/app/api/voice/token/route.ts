// Mivvi: mint a short-lived Gemini Live ephemeral token for the client.
//
// Why: the Gemini Live WebSocket requires auth, but we can't hand the client
// our raw GEMINI_API_KEY (it'd be visible in DevTools). Ephemeral tokens are
// issued by Google AI Studio, live for ~30 min, and scoped to Live sessions
// only — safe to expose to the browser.
//
// Gated behind the same Clerk auth as the rest of the app so random visitors
// can't burn our Gemini quota.
import { NextResponse } from 'next/server'
import { GoogleGenAI, Modality } from '@google/genai'
import { AuthError, requireUser } from '@/lib/authz'

export const runtime = 'nodejs'

const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL ?? 'gemini-2.5-flash-preview-native-audio-dialog'

export async function POST() {
  try {
    await requireUser()
  } catch (e) {
    const err = e as AuthError
    return NextResponse.json({ error: err.message }, { status: err.status ?? 401 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })
  }

  const client = new GoogleGenAI({ apiKey })

  // Generate an ephemeral token valid for 30 minutes of session creation and
  // 1 minute of uses. Client reconnection within that window is free; past
  // that, client asks for a new token.
  const now = Date.now()
  const tokenResp = await client.authTokens.create({
    config: {
      expireTime: new Date(now + 30 * 60_000).toISOString(),
      newSessionExpireTime: new Date(now + 1 * 60_000).toISOString(),
      liveConnectConstraints: {
        model: LIVE_MODEL,
        config: { responseModalities: [Modality.AUDIO] },
      },
      uses: 1,
    },
  })

  return NextResponse.json({
    token: tokenResp.name,
    model: LIVE_MODEL,
  })
}
