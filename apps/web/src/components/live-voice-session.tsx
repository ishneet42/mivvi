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
  { name: 'finalize',
    description: 'Write the assignments to the ledger as Expense rows.',
    parameters: { type: Type.OBJECT, properties: {} } },
]

export function LiveVoiceSession({
  receiptId, groupId, voice = 'Puck', videoRef, onAfterTool, className,
}: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [speaking, setSpeaking] = useState(false)
  const [listening, setListening] = useState(false)

  const sessionRef = useRef<Session | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const playbackCtxRef = useRef<AudioContext | null>(null)
  const playbackTimeRef = useRef<number>(0)
  const videoSamplerRef = useRef<number | null>(null)

  async function ensureMicWorklet(ctx: AudioContext) {
    const workletSrc = `
      class MicChunker extends AudioWorkletProcessor {
        process(inputs) {
          const input = inputs[0]?.[0]
          if (!input) return true
          const ratio = sampleRate / ${INPUT_SAMPLE_RATE}
          const outLen = Math.floor(input.length / ratio)
          const out = new Int16Array(outLen)
          for (let i = 0; i < outLen; i++) {
            const sample = input[Math.floor(i * ratio)] ?? 0
            const s = Math.max(-1, Math.min(1, sample))
            out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
          }
          this.port.postMessage(out, [out.buffer])
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

    // 2) Mint a token.
    console.log('[voice] step 2: minting ephemeral token')
    setPhase('minting-token')
    let token: string, model: string
    try {
      const tokenRes = await fetch('/api/voice/token', { method: 'POST' })
      const body = (await tokenRes.json().catch(() => ({}))) as {
        token?: string; model?: string; error?: string
      }
      if (!tokenRes.ok) {
        throw new Error(`HTTP ${tokenRes.status}: ${body.error ?? 'unknown'}`)
      }
      if (!body.token || !body.model) throw new Error('token mint returned no token')
      token = body.token
      model = body.model
      console.log('[voice] token ok, model =', model)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[voice] token mint failed:', e)
      setError(`Couldn't get a Gemini Live token: ${msg}`)
      setPhase('error')
      micStream.getTracks().forEach((t) => t.stop())
      return
    }

    // 3) Open the Live session (with a hard timeout — the promise has been
    //    observed to hang on misconfigured API keys).
    console.log('[voice] step 3: opening ai.live.connect')
    setPhase('connecting')
    let session: Session
    try {
      const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: 'v1alpha' } })
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
          systemInstruction: [
            "You are Mivvi's conversational voice assistant for bill splitting.",
            'The user is pointing their camera at a receipt. You can SEE the receipt frames and HEAR the user.',
            'When they describe how to split ("I had the pizza", "split evenly"), use the tools:',
            'first list_items and list_people to learn the ids, then assign_item / split_remaining_evenly / set_tip.',
            'Feel free to comment on what you see ("I see the pizza for $6.50") to confirm context.',
            'Keep spoken replies to one short sentence per turn.',
            'Before calling finalize, call get_summary, briefly read per-person totals, and ask for confirmation.',
            'Items with parsed_confidence under 0.6 must be confirmed verbally before assignment.',
          ].join(' '),
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
              const functionResponses: any[] = []
              for (const call of toolCalls) {
                let result: unknown = { ok: false, error: 'no receipt loaded' }
                if (receiptId) {
                  try {
                    const res = await fetch('/api/tools', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({
                        name: call.name,
                        args: call.args ?? {},
                        receiptId,
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
            console.log('[voice] onclose:', e?.reason ?? '(no reason)')
            if (sessionRef.current) setPhase('idle')
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
      worklet.port.onmessage = (e: MessageEvent<Int16Array>) => {
        if (!sessionRef.current) return
        const b64 = pcm16ToBase64(e.data)
        try {
          sessionRef.current.sendRealtimeInput({
            audio: { data: b64, mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}` },
          })
        } catch {}
      }
      source.connect(worklet)
      console.log('[voice] ready')
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
