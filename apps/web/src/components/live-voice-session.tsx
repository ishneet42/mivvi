'use client'

// Mivvi Live Voice — pure Gemini Live with simultaneous mic + camera streaming.
//
// Flow:
//   1. User taps Talk-to-AI.
//   2. We request mic permission IMMEDIATELY (surfaces denial right away —
//      silent failures here were the source of "button does nothing" reports).
//   3. Fetch an ephemeral token from /api/voice/token.
//   4. Open ai.live.connect with a 10s timeout (the promise used to hang
//      forever on misconfigured keys — users saw no feedback).
//   5. On open: start mic worklet + video sampler.
//   6. Tool calls → /api/tools (shared impl with text agent).
//   7. Audio chunks from Gemini → scheduled playback on a 24kHz AudioContext.
//
// Errors at any stage are surfaced in a large, clearly-visible banner with
// the stage label so we can diagnose where it broke.
import { GoogleGenAI, Modality, Type, type Session } from '@google/genai'
import { Mic, MicOff, Loader2, AlertTriangle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

type Props = {
  receiptId: string | null
  groupId: string
  voice?: string
  /** <video> element streaming the back camera. Frames are sampled from
   *  here at ~1 fps and sent to Gemini as visual context. */
  videoRef?: RefObject<HTMLVideoElement | null>
  /** Group context baked into the Gemini system prompt so it knows who
   *  "I" is and who "the others" are without having to call list_people
   *  before every assignment. Concrete names in the prompt also let the
   *  model resolve fuzzy phrases ("I had the sandwich and two other
   *  people split the rest") into actual participant ids. */
  groupName?: string
  participantNames?: string[]
  currentUserName?: string
  onAfterTool?: () => void
  className?: string
}

type Phase = 'idle' | 'requesting-mic' | 'minting-token' | 'connecting' | 'live' | 'error'

const OUTPUT_SAMPLE_RATE = 24_000
const INPUT_SAMPLE_RATE = 16_000
// Video frame rate to Gemini. 1 fps is plenty for a mostly-static receipt
// and keeps token cost low. Bump to 2–3 fps if responsiveness matters more.
const VIDEO_FPS = 1
// Live connect has been observed to hang silently on misconfigured keys;
// time out rather than leaving the user staring at "Connecting…" forever.
const CONNECT_TIMEOUT_MS = 15_000

function pcm16ToBase64(samples: Int16Array): string {
  const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function base64ToPcm16(b64: string): Int16Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Int16Array(bytes.buffer)
}

// Gemini's functionResponse.response must be an object (dict). Our
// list_items / list_people / get_summary tools return arrays — wrap them.
function normalizeToolResult(result: unknown): Record<string, unknown> {
  if (Array.isArray(result)) return { items: result }
  if (result && typeof result === 'object') return result as Record<string, unknown>
  return { value: result as any }
}

const LIVE_TOOLS = [
  { name: 'list_items',
    description: 'List parsed receipt items and their current assignments.',
    parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'list_people',
    description: 'List group members eligible to be assigned items.',
    parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'assign_item',
    description: 'Assign an item to one or more people, optionally with weights.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        item_id: { type: Type.STRING },
        person_ids: { type: Type.ARRAY, items: { type: Type.STRING } },
        weights: { type: Type.ARRAY, items: { type: Type.NUMBER } },
      },
      required: ['item_id', 'person_ids'],
    } },
  { name: 'unassign_item',
    description: 'Clear all assignments on an item.',
    parameters: {
      type: Type.OBJECT,
      properties: { item_id: { type: Type.STRING } },
      required: ['item_id'],
    } },
  { name: 'split_remaining_evenly',
    description: 'Assign every still-unassigned item evenly across the given people (or everyone).',
    parameters: {
      type: Type.OBJECT,
      properties: { person_ids: { type: Type.ARRAY, items: { type: Type.STRING } } },
    } },
  { name: 'mark_person_absent',
    description: 'Exclude a person from default even-splits for this receipt.',
    parameters: {
      type: Type.OBJECT,
      properties: { person_id: { type: Type.STRING } },
      required: ['person_id'],
    } },
  { name: 'set_tip',
    description: 'Set tip as absolute amount or percent of subtotal.',
    parameters: {
      type: Type.OBJECT,
      properties: { amount: { type: Type.NUMBER }, percent: { type: Type.NUMBER } },
    } },
  { name: 'get_summary',
    description: "Return each person's running total for this receipt.",
    parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'rename_receipt',
    description: 'Set a human-friendly title for this receipt (e.g. "Dinner at Gaya\'s"). User can ask "name this Saturday Outing" or "rename to dinner".',
    parameters: {
      type: Type.OBJECT,
      properties: { title: { type: Type.STRING } },
      required: ['title'],
    } },
  { name: 'finalize',
    description: 'Write the assignments to the ledger as Expense rows.',
    parameters: { type: Type.OBJECT, properties: {} } },
]

export function LiveVoiceSession({
  receiptId, groupId, voice = 'Puck', videoRef,
  groupName, participantNames, currentUserName,
  onAfterTool, className,
}: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [speaking, setSpeaking] = useState(false)
  const [listening, setListening] = useState(false)
  // Live transcripts from Gemini's {input,output}AudioTranscription.
  // Proves the mic audio is reaching the model and lets the user see
  // Gemini's response even if audio playback glitches.
  const [userTranscript, setUserTranscript] = useState('')
  const [aiTranscript, setAiTranscript] = useState('')
  // Rolling counter of mic chunks sent, so user can see audio is actually
  // flowing (not just "Listening" with nothing happening).
  const [chunkCount, setChunkCount] = useState(0)
  // Recent tool calls — surfaced in the UI so users can see Gemini is
  // actually mutating state (vs just talking). Capped at last 5.
  const [recentTools, setRecentTools] = useState<string[]>([])

  const sessionRef = useRef<Session | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const playbackCtxRef = useRef<AudioContext | null>(null)
  const playbackTimeRef = useRef<number>(0)
  const videoSamplerRef = useRef<number | null>(null)
  // Live mirror of the receiptId prop — the start() closure captures
  // values once, so without a ref the tool handler would keep seeing
  // null even after the user captures and a receipt becomes available.
  // Updated on every render via the effect below.
  const receiptIdRef = useRef<string | null>(receiptId)
  // Track the previous value separately so we can detect the
  // null → set transition and nudge Gemini to execute pre-capture
  // instructions on the freshly-loaded receipt.
  const prevReceiptIdRef = useRef<string | null>(receiptId)

  useEffect(() => {
    receiptIdRef.current = receiptId
    const prev = prevReceiptIdRef.current
    prevReceiptIdRef.current = receiptId

    // Receipt just became available WHILE a Live session is open.
    // Push a text nudge so Gemini knows to act on earlier instructions
    // instead of waiting for the user to repeat themselves.
    if (!prev && receiptId && sessionRef.current && phase === 'live') {
      try {
        sessionRef.current.sendClientContent({
          turns: [{
            role: 'user',
            parts: [{
              text:
                "[The receipt I was pointing the camera at has just been captured " +
                "and parsed. Your tools (list_items, list_people, assign_item, " +
                "split_remaining_evenly, set_tip, get_summary, finalize, " +
                "rename_receipt) are now available. " +
                "Based on what I told you earlier in this conversation, please " +
                "execute the assignments now: first call list_items and list_people " +
                "to learn the ids, then perform the splits I described. " +
                "If my earlier instructions were vague or you need a clarification, " +
                "ask one short question. Otherwise just do it and read me the totals " +
                "at the end.]",
            }],
          }],
          turnComplete: true,
        })
        console.log('[voice] receipt-ready nudge sent to Gemini')
      } catch (e) {
        console.warn('[voice] failed to send receipt-ready nudge', e)
      }
    }
  }, [receiptId, phase])

  async function ensureMicWorklet(ctx: AudioContext) {
    // Downsamples device rate → 16kHz PCM16 and BUFFERS into ~100ms chunks
    // before posting. Tiny (~3ms) chunks flooded the WebSocket and the
    // Live VAD never detected speech. 100ms is the sweet spot Google
    // recommends for streaming audio input.
    const workletSrc = `
      const TARGET_RATE = ${INPUT_SAMPLE_RATE};
      const CHUNK_SAMPLES = Math.floor(TARGET_RATE * 0.1); // 1600 samples @ 16kHz = 100ms
      class MicChunker extends AudioWorkletProcessor {
        constructor() {
          super();
          this.buf = new Int16Array(CHUNK_SAMPLES);
          this.idx = 0;
        }
        process(inputs) {
          const input = inputs[0]?.[0]
          if (!input) return true
          const ratio = sampleRate / TARGET_RATE
          const outLen = Math.floor(input.length / ratio)
          for (let i = 0; i < outLen; i++) {
            const sample = input[Math.floor(i * ratio)] ?? 0
            const s = Math.max(-1, Math.min(1, sample))
            this.buf[this.idx++] = s < 0 ? s * 0x8000 : s * 0x7FFF
            if (this.idx >= CHUNK_SAMPLES) {
              const out = this.buf.slice(0)
              this.port.postMessage(out, [out.buffer])
              this.idx = 0
            }
          }
          return true
        }
      }
      registerProcessor('mic-chunker', MicChunker)
    `
    const blob = new Blob([workletSrc], { type: 'application/javascript' })
    const url = URL.createObjectURL(blob)
    try { await ctx.audioWorklet.addModule(url) } finally { URL.revokeObjectURL(url) }
  }

  function startVideoSampler() {
    stopVideoSampler()
    const video = videoRef?.current
    if (!video) { console.warn('[voice] no videoRef — Gemini will be audio-only'); return }
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const interval = 1000 / VIDEO_FPS
    videoSamplerRef.current = window.setInterval(() => {
      const session = sessionRef.current
      if (!session || !video.videoWidth || !video.videoHeight) return
      const longEdge = 640
      const scale = Math.min(1, longEdge / Math.max(video.videoWidth, video.videoHeight))
      canvas.width = Math.round(video.videoWidth * scale)
      canvas.height = Math.round(video.videoHeight * scale)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
      const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
      try {
        session.sendRealtimeInput({ video: { data: b64, mimeType: 'image/jpeg' } })
      } catch { /* session closed */ }
    }, interval)
  }
  function stopVideoSampler() {
    if (videoSamplerRef.current != null) {
      clearInterval(videoSamplerRef.current)
      videoSamplerRef.current = null
    }
  }

  const stop = useCallback(async () => {
    console.log('[voice] stop()')
    stopVideoSampler()
    try { sessionRef.current?.close() } catch {}
    sessionRef.current = null
    try { workletNodeRef.current?.disconnect() } catch {}
    workletNodeRef.current = null
    try { micStreamRef.current?.getTracks().forEach((t) => t.stop()) } catch {}
    micStreamRef.current = null
    try { await audioCtxRef.current?.close() } catch {}
    audioCtxRef.current = null
    try { await playbackCtxRef.current?.close() } catch {}
    playbackCtxRef.current = null
    playbackTimeRef.current = 0
    setListening(false)
    setSpeaking(false)
    setPhase('idle')
  }, [])

  const start = useCallback(async () => {
    if (phase !== 'idle' && phase !== 'error') {
      console.log('[voice] start ignored — already', phase)
      return
    }
    setError(null)

    // 1) Request mic BEFORE anything else — this triggers the permission
    //    prompt so failures are obvious. Previously we requested it AFTER
    //    opening the WebSocket, which made denial look like a silent hang.
    console.log('[voice] step 1: requesting mic permission')
    setPhase('requesting-mic')
    let micStream: MediaStream
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micStreamRef.current = micStream
      console.log('[voice] mic ok')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[voice] mic denied:', e)
      setError(`Microphone access is required. ${msg}`)
      setPhase('error')
      return
    }

    // 2) Get credentials + model. Prefer NEXT_PUBLIC_GEMINI_API_KEY if set
    //    (simplest and most reliable — this is how Google's own Live demo
    //    works). Falls back to the ephemeral-token route otherwise.
    console.log('[voice] step 2: getting Live credentials')
    setPhase('minting-token')
    let apiKey: string, model: string
    const publicKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
    // Live model shortlist on our API tier (confirmed via /api/voice/models
    // against Gemini's models.list): gemini-3.1-flash-live-preview is the
    // only non-audio-only option that supports audio + video + tool calls.
    // The native-audio-* variants support bidiGenerateContent too but are
    // audio-only and would reject session.sendRealtimeInput({ video: ... }).
    const publicModel = process.env.NEXT_PUBLIC_GEMINI_LIVE_MODEL ?? 'gemini-3.1-flash-live-preview'
    if (publicKey) {
      apiKey = publicKey
      model = publicModel
      console.log('[voice] using NEXT_PUBLIC_GEMINI_API_KEY, model =', model)
    } else {
      try {
        // 10s fetch timeout so a hung serverless function doesn't leave the
        // button stuck on "Minting token…" forever.
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), 10_000)
        const tokenRes = await fetch('/api/voice/token', { method: 'POST', signal: ctrl.signal })
        clearTimeout(timer)
        const body = (await tokenRes.json().catch(() => ({}))) as {
          token?: string; model?: string; error?: string
        }
        if (!tokenRes.ok) {
          throw new Error(`HTTP ${tokenRes.status}: ${body.error ?? 'unknown'}`)
        }
        if (!body.token || !body.model) throw new Error('token mint returned no token')
        apiKey = body.token
        model = body.model
        console.log('[voice] token ok, model =', model)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error('[voice] token mint failed:', e)
        setError(
          `Couldn't get a Gemini Live token: ${msg}. ` +
          `Tip: set NEXT_PUBLIC_GEMINI_API_KEY on Vercel to skip token minting.`,
        )
        setPhase('error')
        micStream.getTracks().forEach((t) => t.stop())
        return
      }
    }

    // 3) Open the Live session (with a hard timeout — the promise has been
    //    observed to hang on misconfigured API keys).
    console.log('[voice] step 3: opening ai.live.connect')
    setPhase('connecting')
    let session: Session
    try {
      const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1alpha' } })
      const playbackCtx = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE })
      // Safari/iOS requires resume() after user gesture. Tapping the button
      // counts, so this is safe.
      if (playbackCtx.state === 'suspended') await playbackCtx.resume()
      playbackCtxRef.current = playbackCtx
      playbackTimeRef.current = playbackCtx.currentTime

      const connectPromise = ai.live.connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
          },
          // Transcription config was previously enabled for debugging but
          // the combination (model + transcription) caused Gemini to close
          // the socket immediately on some API-key tiers. Start minimal.
          systemInstruction: [
            "You are Mivvi's voice assistant for bill splitting. Your JOB is to call tools that mutate the database, not to describe what you would do.",
            '',
            // Session-start state. If a receiptId was already loaded when
            // the user tapped Talk-to-AI (e.g. they're on the snap page
            // post-scan), tools are live IMMEDIATELY — the model should
            // not waste a turn telling them to tap capture.
            receiptId
              ? '## SESSION STATE: A receipt is ALREADY CAPTURED and parsed. Tools are LIVE right now. Skip the "tap capture" preamble. When the user gives an instruction, call tools immediately.'
              : '## SESSION STATE: No receipt captured yet. The user is on the scan page pointing the camera at a receipt. Acknowledge their instructions warmly, but do not call mutation tools — only respond with a short sentence telling them to tap the round capture button.',
            '',
            '## CRITICAL RULE — ACT, DO NOT DESCRIBE',
            "When the user gives a split instruction and tools are available, your VERY NEXT response IS a tool call, not a sentence. The UI shows the user every assignment as it lands — they don't need you to narrate.",
            '',
            'WRONG: "OK, I\'ll split the pizza three ways between you, Manny, and Kai."',
            'WRONG: "Sure, I can do that for you."',
            'RIGHT: [call list_items] → [call list_people] → [call assign_item with the right ids] → speak ONE sentence: "Done. Pizza split three ways."',
            '',
            'If you find yourself about to say "I will" or "I\'ll", STOP and emit a tool call instead.',
            '',
            // Group context baked in so the AI doesn't have to call
            // list_people before every assignment. Concrete names also
            // let it resolve "I had the sandwich, two other people had
            // the rest" into actual ids.
            '## Group context',
            groupName ? `Group name: ${groupName}` : '',
            participantNames && participantNames.length > 0
              ? `Participants in this group: ${participantNames.join(', ')}.`
              : '',
            currentUserName
              ? `The signed-in user (the person speaking to you right now) is "${currentUserName}". When they say "I", "me", "my", they mean ${currentUserName}. When they say "the others", "everyone else", or "the rest", they mean the OTHER participants — not ${currentUserName}.`
              : '',
            '',
            '## Tools (call these — do not narrate them)',
            '- list_items: returns the parsed receipt items with their IDs and prices',
            '- list_people: returns the participant IDs',
            '- assign_item(item_id, person_ids[], weights?): assigns one item to one or more people',
            '- split_remaining_evenly(person_ids?): assigns ALL still-unassigned items evenly across the listed people, or everyone if omitted',
            '- mark_person_absent(person_id): excludes from default splits',
            '- set_tip({amount?, percent?}): sets the tip',
            '- get_summary: returns per-person running totals',
            '- rename_receipt(title): renames this receipt',
            '- finalize: writes the assignments to the ledger as Expense rows',
            '',
            '## Flow',
            '',
            "### BEFORE capture (any tool returns status 'no_receipt_yet')",
            "Acknowledge the user's instructions warmly in ONE short sentence ('Got it, I\\'ll split the pizza three ways once you capture.') and tell them to tap the round capture button. DO NOT CALL TOOLS YET. Just remember.",
            '',
            '### AFTER capture (receipt loaded — also signaled by a [bracketed] system message)',
            'Execute IMMEDIATELY. The order:',
            '  1. ONE silent call to list_items',
            '  2. (Skip list_people if you already know the ids from group context — names are unique within a group, but if you need to confirm, call list_people once.)',
            '  3. The actual mutation tool calls (assign_item, split_remaining_evenly, set_tip, mark_person_absent) for what the user described.',
            '  4. ONE call to get_summary',
            '  5. ONE short spoken reply with per-person totals + "Should I finalize?"',
            '  6. On user confirmation, ONE call to finalize.',
            '',
            'Items with parsed_confidence under 0.6 must be confirmed verbally before you assign them.',
            'Never invent items or people that are not in the tool results.',
            '',
            '## Examples',
            'User (after capture): "I had the sandwich, the others split the rest evenly."',
            '  → list_items → assign_item(sandwich_id, [currentUser_id]) → split_remaining_evenly([other ids]) → get_summary → "Sandwich is on you ($8.50). The other two split $24 — that\\'s $12 each. Should I finalize?"',
            '',
            'User: "Split the wine three ways between Ishi, Manny, and Kai."',
            '  → list_items → assign_item(wine_id, [ishi_id, manny_id, kai_id]) → get_summary → "Wine split three ways at $X each. Should I finalize?"',
          ].join('\n'),
          tools: [{ functionDeclarations: LIVE_TOOLS as any }],
        },
        callbacks: {
          onopen: () => {
            console.log('[voice] session open')
            setPhase('live')
            setListening(true)
            startVideoSampler()
          },
          onmessage: async (message: any) => {
            // Verbose but invaluable — lets you see every message type
            // Gemini sends (modelTurn / toolCall / turnComplete /
            // inputTranscription / outputTranscription / setupComplete /
            // goAway). Strip once stable.
            console.log('[voice] message keys:', Object.keys(message ?? {}),
              'serverContent keys:', Object.keys(message?.serverContent ?? {}))

            // Live transcripts (both sides). Feed the UI so the user can
            // SEE whether their mic audio is being heard.
            const inTx = message?.serverContent?.inputTranscription?.text
            const outTx = message?.serverContent?.outputTranscription?.text
            if (inTx) { console.log('[voice] heard user:', inTx); setUserTranscript((t) => t + inTx) }
            if (outTx) { console.log('[voice] AI says:', outTx); setAiTranscript((t) => t + outTx) }
            if (message?.serverContent?.turnComplete) {
              setUserTranscript('')
              // Keep AI transcript on screen briefly so user can read it.
              setTimeout(() => setAiTranscript(''), 4000)
            }

            const audioB64 = message?.serverContent?.modelTurn?.parts?.find((p: any) => p.inlineData?.data)?.inlineData?.data
            if (audioB64) {
              setSpeaking(true)
              const samples = base64ToPcm16(audioB64)
              const buffer = playbackCtx.createBuffer(1, samples.length, OUTPUT_SAMPLE_RATE)
              const channel = buffer.getChannelData(0)
              for (let i = 0; i < samples.length; i++) channel[i] = samples[i] / 0x8000
              const source = playbackCtx.createBufferSource()
              source.buffer = buffer
              source.connect(playbackCtx.destination)
              const startAt = Math.max(playbackTimeRef.current, playbackCtx.currentTime)
              source.start(startAt)
              playbackTimeRef.current = startAt + buffer.duration
              source.onended = () => {
                if (playbackCtx.currentTime >= playbackTimeRef.current - 0.05) setSpeaking(false)
              }
            }

            const toolCalls = message?.toolCall?.functionCalls ?? []
            if (toolCalls.length > 0) {
              // Visible feedback: stash the names for the UI chip strip.
              setRecentTools((prev) =>
                [...prev, ...toolCalls.map((c: any) => c.name)].slice(-5),
              )
              console.log('[voice] tool calls:', toolCalls.map((c: any) => `${c.name}(${JSON.stringify(c.args)})`))
              const functionResponses: any[] = []
              for (const call of toolCalls) {
                // Read the LIVE receiptId, not the closure-captured one.
                // Otherwise tapping Talk to AI before capturing freezes
                // receiptId at null even after a successful scan.
                const liveReceiptId = receiptIdRef.current
                let result: unknown = {
                  ok: false,
                  status: 'no_receipt_yet',
                  message: 'No receipt has been captured yet. Tell the user to point the camera at the receipt and tap the round capture button at the bottom of the screen — once it parses, your tools will work.',
                }
                if (liveReceiptId) {
                  try {
                    const res = await fetch('/api/tools', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({
                        name: call.name,
                        args: call.args ?? {},
                        receiptId: liveReceiptId,
                        groupId,
                      }),
                    })
                    const j = (await res.json()) as { result?: unknown; error?: string }
                    result = j.result ?? { ok: false, error: j.error ?? 'tool failed' }
                  } catch (e) {
                    result = { ok: false, error: e instanceof Error ? e.message : String(e) }
                  }
                }
                functionResponses.push({
                  id: call.id,
                  name: call.name,
                  response: normalizeToolResult(result),
                })
              }
              sessionRef.current?.sendToolResponse({ functionResponses })
              onAfterTool?.()
            }

            if (message?.serverContent?.turnComplete) setSpeaking(false)
          },
          onerror: (e: any) => {
            console.error('[voice] onerror:', e)
            setError(e?.message ?? 'live session error')
            setPhase('error')
          },
          onclose: (e: any) => {
            // Surface the close reason with code + message so early-close
            // failures don't silently drop back to "Talk to AI" with no
            // explanation. Google commonly uses code 1007 (invalid data),
            // 1008 (policy — usually API key / quota), or custom reasons.
            const code = e?.code ?? '(no code)'
            const reason = e?.reason ?? '(no reason)'
            console.error('[voice] onclose:', code, reason, e)
            // If the socket closes while we're still live (not after an
            // explicit user stop), show an error banner with the reason.
            if (sessionRef.current) {
              setError(`Gemini closed the session · code ${code}: ${reason || 'no reason given'}`)
              setPhase('error')
              sessionRef.current = null
            }
          },
        },
      })

      session = await Promise.race([
        connectPromise,
        new Promise<Session>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Gemini Live didn't respond within ${CONNECT_TIMEOUT_MS / 1000}s`)),
            CONNECT_TIMEOUT_MS,
          ),
        ),
      ])
      sessionRef.current = session
      console.log('[voice] connect resolved')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[voice] live.connect failed:', e)
      setError(`Gemini Live connect failed: ${msg}`)
      setPhase('error')
      micStream.getTracks().forEach((t) => t.stop())
      return
    }

    // 4) Wire mic → session.
    console.log('[voice] step 4: wiring mic worklet')
    try {
      const micCtx = new AudioContext()
      if (micCtx.state === 'suspended') await micCtx.resume()
      audioCtxRef.current = micCtx
      await ensureMicWorklet(micCtx)
      const source = micCtx.createMediaStreamSource(micStream)
      const worklet = new AudioWorkletNode(micCtx, 'mic-chunker')
      workletNodeRef.current = worklet
      let sent = 0
      worklet.port.onmessage = (e: MessageEvent<Int16Array>) => {
        if (!sessionRef.current) return
        const b64 = pcm16ToBase64(e.data)
        try {
          sessionRef.current.sendRealtimeInput({
            audio: { data: b64, mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}` },
          })
          sent++
          // Update UI counter every 10 chunks (~1s) so user sees audio flow.
          if (sent % 10 === 0) setChunkCount(sent)
        } catch {}
      }
      // Connect the worklet output into a muted gain → destination. Without a
      // connection to the destination, some browsers skip process() entirely
      // and the worklet never runs, so no mic chunks are ever posted — that
      // was the "Listening but no audio" failure mode.
      const mute = micCtx.createGain()
      mute.gain.value = 0
      source.connect(worklet)
      worklet.connect(mute)
      mute.connect(micCtx.destination)
      console.log('[voice] ready, audio graph: source → worklet → mute(0) → destination')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[voice] mic wiring failed:', e)
      setError(`Microphone wiring failed: ${msg}`)
      setPhase('error')
      await stop()
    }
  }, [phase, groupId, receiptId, voice, videoRef, stop, onAfterTool])

  useEffect(() => () => { void stop() }, [stop])

  const busy = phase === 'requesting-mic' || phase === 'minting-token' || phase === 'connecting'
  const active = phase === 'live'

  const stageLabel =
    phase === 'requesting-mic' ? 'Asking for mic…' :
    phase === 'minting-token'  ? 'Minting token…' :
    phase === 'connecting'     ? 'Connecting to Gemini…' :
    phase === 'live'           ? (speaking ? 'AI speaking…' : listening ? 'Listening…' : 'Live')
                               : 'Talk to AI'

  return (
    <div className={className}>
      <button
        type="button"
        onClick={active ? stop : start}
        disabled={busy}
        className={
          'flex items-center gap-2 h-11 px-4 rounded-full text-sm font-medium transition ' +
          (active
            ? (speaking
                ? 'bg-[#E5634E] text-white'
                : 'bg-[#1A1410] text-[#F4ECDB] ring-2 ring-[#E5634E] ring-offset-2 ring-offset-[#1A1410]')
            : 'bg-[rgba(255,253,247,0.95)] text-[#1A1410] hover:bg-white')
        }
      >
        {busy
          ? <><Loader2 className="w-4 h-4 animate-spin" /> {stageLabel}</>
          : active
            ? <><MicOff className="w-4 h-4" /> {stageLabel}</>
            : <><Mic className="w-4 h-4" /> {stageLabel}</>}
      </button>

      {/* Live transcripts + tool-call indicator. Critical for trust:
          users can SEE Gemini is hitting tools (assign_item etc), not
          just talking. If chips never appear, Gemini is narrating
          intent instead of acting — a known LLM failure mode. */}
      {active && (userTranscript || aiTranscript || chunkCount > 0 || recentTools.length > 0) && (
        <div className="mt-3 max-w-md rounded-2xl bg-[rgba(26,20,16,0.85)] text-[#F4ECDB] px-4 py-3 text-sm shadow-lg space-y-2">
          {userTranscript && (
            <div><span className="opacity-60 text-xs">You:</span> {userTranscript}</div>
          )}
          {aiTranscript && (
            <div><span className="opacity-60 text-xs">AI:</span> {aiTranscript}</div>
          )}
          {recentTools.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1 border-t border-white/10">
              <span className="opacity-50 text-[10px] uppercase tracking-wider mr-1 self-center">tools</span>
              {recentTools.map((t, i) => (
                <span key={i} className="text-[10px] font-mono bg-[#E5634E]/20 text-[#FFC9BD] px-1.5 py-0.5 rounded">
                  {t}
                </span>
              ))}
            </div>
          )}
          {!userTranscript && !aiTranscript && chunkCount > 0 && recentTools.length === 0 && (
            <div className="text-xs opacity-60">
              Streaming audio to Gemini… ({chunkCount * 0.1}s).
            </div>
          )}
        </div>
      )}

      {phase === 'error' && error && (
        <div className="mt-3 max-w-md w-[90vw] sm:w-auto rounded-2xl bg-[#7A1F10] text-white border border-[#E5634E] px-4 py-3 flex items-start gap-2 shadow-lg">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">
              Voice error
            </div>
            <div className="text-sm break-words">{error}</div>
            <button
              onClick={() => { setError(null); setPhase('idle') }}
              className="mt-2 text-xs underline opacity-80"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
