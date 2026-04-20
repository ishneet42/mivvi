'use client'

// Mivvi Live Voice: Gemini Live-powered conversational voice layer that
// delegates the actual split logic to our existing OpenAI agent.
//
// Architecture:
//   User speaks  → Gemini Live WebSocket (audio in)
//                → Gemini decides: direct reply OR call invoke_split_agent()
//                → When called, client POSTs to /api/agent (our 9-tool agent)
//                → Agent result returned as tool response
//                → Gemini speaks a summary in the selected voice
//
// This gives us Gemini Live's UX (low-latency voice, natural neural voices,
// interruption handling) while keeping the measured agent (prompts, guardrail,
// preferences injection, eval corpus) as the source of truth for splits.
import { GoogleGenAI, Modality, type Session } from '@google/genai'
import { Mic, MicOff, Loader2, AlertTriangle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

type Props = {
  receiptId: string | null
  groupId: string
  /** Gemini voice name. Defaults to 'Puck' if not set. */
  voice?: string
  onAgentResult?: (result: { narration: string; toolCallsExecuted: number }) => void
  className?: string
}

type Phase = 'idle' | 'connecting' | 'live' | 'error'

// Gemini Live emits 24kHz PCM16 audio; we play it with an AudioContext.
const OUTPUT_SAMPLE_RATE = 24_000
// Gemini Live expects 16kHz PCM16 input.
const INPUT_SAMPLE_RATE = 16_000

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

export function LiveVoiceSession({ receiptId, groupId, voice = 'Puck', onAgentResult, className }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [speaking, setSpeaking] = useState(false)
  const [listening, setListening] = useState(false)

  const sessionRef = useRef<Session | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const playbackCtxRef = useRef<AudioContext | null>(null)
  const playbackTimeRef = useRef<number>(0)

  // Ensure the mic worklet module is registered exactly once per AudioContext.
  async function ensureMicWorklet(ctx: AudioContext) {
    const workletSrc = `
      class MicChunker extends AudioWorkletProcessor {
        process(inputs) {
          const input = inputs[0]?.[0]
          if (!input) return true
          // Downsample float32 @ctx.sampleRate → int16 @16kHz
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
    try {
      await ctx.audioWorklet.addModule(url)
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  const stop = useCallback(async () => {
    try { sessionRef.current?.close() } catch { /* noop */ }
    sessionRef.current = null
    try { workletNodeRef.current?.disconnect() } catch {}
    workletNodeRef.current = null
    try { streamRef.current?.getTracks().forEach((t) => t.stop()) } catch {}
    streamRef.current = null
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
    if (phase === 'connecting' || phase === 'live') return
    setPhase('connecting')
    setError(null)

    try {
      // 1) Grab an ephemeral token from our server (keeps the raw API key private).
      const tokenRes = await fetch('/api/voice/token', { method: 'POST' })
      if (!tokenRes.ok) {
        const body = await tokenRes.text()
        throw new Error(`token fetch failed: ${tokenRes.status} ${body}`)
      }
      const { token, model } = (await tokenRes.json()) as { token: string; model: string }

      // 2) Open a Gemini Live session. Authenticated with the ephemeral token.
      const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: 'v1alpha' } })
      const playbackCtx = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE })
      playbackCtxRef.current = playbackCtx
      playbackTimeRef.current = playbackCtx.currentTime

      const session = await ai.live.connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
          },
          systemInstruction: [
            'You are Mivvi\'s voice copilot for bill-splitting.',
            'When the user describes how a receipt should be split (e.g. "I had the pasta, Maria had the salad"),',
            'ALWAYS call the invoke_split_agent function with their exact message as the user_message argument.',
            'Do not try to compute the split yourself — the specialist agent does that.',
            'After invoking it, give a very brief spoken confirmation ("Done — I\'ve split that") in 1 short sentence.',
            'If the user asks a question not related to splitting this receipt, answer briefly in your own voice.',
          ].join(' '),
          tools: [
            {
              functionDeclarations: [
                {
                  name: 'invoke_split_agent',
                  description: 'Send the user\'s bill-splitting instructions to the specialist agent which updates the receipt assignments.',
                  parameters: {
                    type: 'OBJECT' as any,
                    properties: {
                      user_message: {
                        type: 'STRING' as any,
                        description: 'The user\'s verbatim instruction about how to split the bill.',
                      },
                    },
                    required: ['user_message'],
                  },
                },
              ],
            },
          ],
        },
        callbacks: {
          onopen: () => { setPhase('live'); setListening(true) },
          onmessage: async (message: any) => {
            // a) Server-spoken audio arrives as inline base64 PCM16 at 24kHz.
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

            // b) Tool call — Gemini wants us to run the specialist agent.
            const toolCalls = message?.toolCall?.functionCalls ?? []
            for (const call of toolCalls) {
              if (call.name !== 'invoke_split_agent') continue
              const userMessage = String(call.args?.user_message ?? '').trim()
              let agentNarration = ''
              let toolCallsExecuted = 0
              try {
                if (!receiptId) {
                  agentNarration = 'no active receipt'
                } else {
                  const res = await fetch('/api/agent', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ receiptId, groupId, message: userMessage }),
                  })
                  if (!res.ok || !res.body) {
                    agentNarration = `agent error ${res.status}`
                  } else {
                    const reader = res.body.getReader()
                    const dec = new TextDecoder()
                    let buf = ''
                    while (true) {
                      const { value, done } = await reader.read()
                      if (done) break
                      buf += dec.decode(value, { stream: true })
                    }
                    // Strip the trailing __AGENT_META__ block.
                    const marker = '\n\n__AGENT_META__'
                    const i = buf.indexOf(marker)
                    if (i >= 0) {
                      try {
                        const meta = JSON.parse(buf.slice(i + marker.length)) as { tool_calls?: unknown[] }
                        toolCallsExecuted = meta.tool_calls?.length ?? 0
                      } catch {}
                      agentNarration = buf.slice(0, i).trim()
                    } else {
                      agentNarration = buf.trim()
                    }
                  }
                }
              } catch (e) {
                agentNarration = `bridge error: ${e instanceof Error ? e.message : String(e)}`
              }

              onAgentResult?.({ narration: agentNarration, toolCallsExecuted })

              // Return the agent's narration to Gemini so it can speak a summary.
              sessionRef.current?.sendToolResponse({
                functionResponses: [
                  {
                    id: call.id,
                    name: call.name,
                    response: {
                      summary: agentNarration || 'Done.',
                      tool_calls_executed: toolCallsExecuted,
                    },
                  },
                ],
              })
            }

            if (message?.serverContent?.turnComplete) setSpeaking(false)
          },
          onerror: (e: any) => {
            setError(e?.message ?? 'live session error')
            setPhase('error')
          },
          onclose: () => {
            if (sessionRef.current) setPhase('idle')
          },
        },
      })
      sessionRef.current = session

      // 3) Wire the mic: capture → downsample to 16kHz PCM16 → stream to Gemini.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const micCtx = new AudioContext()
      audioCtxRef.current = micCtx
      await ensureMicWorklet(micCtx)
      const source = micCtx.createMediaStreamSource(stream)
      const worklet = new AudioWorkletNode(micCtx, 'mic-chunker')
      workletNodeRef.current = worklet
      worklet.port.onmessage = (e: MessageEvent<Int16Array>) => {
        if (!sessionRef.current) return
        const b64 = pcm16ToBase64(e.data)
        try {
          sessionRef.current.sendRealtimeInput({
            audio: { data: b64, mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}` },
          })
        } catch { /* session may have closed */ }
      }
      source.connect(worklet)
      // Don't connect the worklet to destination — we don't want to hear our own mic.
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPhase('error')
      await stop()
    }
  }, [phase, groupId, receiptId, voice, stop, onAgentResult])

  useEffect(() => () => { void stop() }, [stop])

  const busy = phase === 'connecting'
  const active = phase === 'live'

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
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting…</>
          : active
            ? <><MicOff className="w-4 h-4" /> {speaking ? 'AI speaking…' : listening ? 'Listening…' : 'Live'}</>
            : <><Mic className="w-4 h-4" /> Talk to AI</>}
      </button>

      {phase === 'error' && error && (
        <div className="mt-3 max-w-sm rounded-2xl bg-[rgba(229,99,78,0.15)] border border-[rgba(229,99,78,0.35)] text-[#FFE6E0] text-xs px-3 py-2 flex items-start gap-2">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
