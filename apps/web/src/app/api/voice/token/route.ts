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

// gemini-live-2.5-flash-preview supports video input (camera frames) alongside
// audio. The native-audio-dialog variant is audio-only — would reject the
// session.sendRealtimeInput({ video: ... }) calls from the client.
const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL ?? 'gemini-live-2.5-flash-preview'

export async function POST() {
  try {
    await requireUser()
  } catch (e) {
    const err = e as AuthError
    return NextResponse.json({ error: err.message }, { status: err.status ?? 401 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY not configured on the server' },
      { status: 500 },
    )
  }

  try {
    const client = new GoogleGenAI({ apiKey })
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
    if (!tokenResp.name) {
      return NextResponse.json(
        { error: 'Google returned an empty ephemeral token name' },
        { status: 502 },
      )
    }
    return NextResponse.json({
      token: tokenResp.name,
      model: LIVE_MODEL,
    })
  } catch (e) {
    // Surface the real Google error back to the client so we don't silently
    // 500 — the most common causes here are (a) the API key doesn't have
    // Live API access on this Google Cloud project, (b) the model name is
    // unknown to the region, or (c) ephemeral tokens aren't yet enabled.
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[voice/token] authTokens.create failed:', e)
    return NextResponse.json(
      { error: `Gemini token mint failed: ${msg}`, model: LIVE_MODEL },
      { status: 502 },
    )
  }
}
