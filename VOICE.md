# Gemini Live voice setup

Mivvi's **Talk to AI** mode uses Google's Gemini Live API for full-duplex
voice (input + output) while delegating all bill-splitting logic to the
existing OpenAI agent. This doc covers the one-time setup.

## What you need

1. **Google AI Studio API key** — https://aistudio.google.com/apikey
2. **Paid tier enabled** on that key (Gemini Live is not in the free tier).
   Tier 1 is fine.
3. **HTTP referrer restriction** on the key (recommended after first smoke
   test) so nobody else can use it.

## Vercel environment variables

Add these alongside the existing ones:

```
GEMINI_API_KEY            = <your aistudio key>
GEMINI_LIVE_MODEL         = gemini-2.5-flash-preview-native-audio-dialog
```

The model name rarely needs to change; leaving `GEMINI_LIVE_MODEL` unset
falls back to the same default.

## Neon migration

The voice feature adds one column (`UserProfile.voiceName`) for each user's
chosen voice. `prisma migrate deploy` applies it automatically when Vercel
runs `vercel-build`.

If you're using a pre-existing Neon DB that's already past the earlier
migrations and want to apply just this one manually:

```sql
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "voiceName" TEXT;
```

## Cost

Gemini Live audio pricing (as of April 2026):
- **Input:** ~$0.075/minute of audio
- **Output:** ~$0.30/minute of audio (generated speech)

For a 1-minute conversation per split: ~$0.40. For your 4-friend user study
dinner with ~5 split events: ~$2 total.

## Security — rotate that first key

If you pasted the key into chat / a deployment form / anywhere public:
1. Go to https://aistudio.google.com/apikey
2. **Delete** the old key
3. **Create API key in existing project** to make a new one
4. On the key details page, **Add application restriction → HTTP referrers**
   and enter:
   - `https://mivvi.vercel.app/*`
   - `http://localhost:3000/*` (for dev)
5. Update `GEMINI_API_KEY` on Vercel + redeploy

## How it works

```
User (phone mic)
    │
    ▼ WebRTC audio → PCM16 @ 16kHz
Client (browser)
    │
    │  WebSocket with ephemeral token
    ▼
Gemini Live session
    │
    │ Heard user say something that sounds like a split command?
    ▼
Tool call: invoke_split_agent(user_message: string)
    │
    ▼
Client intercepts tool call
    │
    │  POST /api/agent (our existing OpenAI agent)
    ▼
OpenAI gpt-4o-mini + our 9 tools + preferences + guardrail
    │
    │ Returns text narration + metadata
    ▼
Client sends tool response back to Gemini
    │
    ▼
Gemini speaks a brief confirmation in the user's chosen voice
    │
    ▼
Playback (Web Audio API) — PCM16 @ 24kHz
```

Key property: **all measurable eval work is preserved.** The agent that
does the actual splitting is the same OpenAI implementation we've been
tuning across V1/V2/V3. Gemini is strictly the voice layer.

## Voice picker

Users choose their voice on `/profile` → AI voice. The 8 prebuilt Gemini
voices (Puck, Charon, Kore, Fenrir, Aoede, Leda, Orus, Zephyr) each have
distinct personas. Selection is persisted per user and loaded on every
scan session.

## Fallback

If `GEMINI_API_KEY` is not set, the scan page silently falls back to the
free Web Speech API dictation (transcribe-only, no spoken response). This
is how Mivvi worked before — still functional, just less magical.
