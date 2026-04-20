'use client'

// Mivvi voice dictation: thin wrapper over the browser's Web Speech API. Used
// on the scan page to let the user narrate the split ("Ishi got the pasta…")
// while framing the receipt. Zero server/LLM cost — everything runs on-device
// via Chrome / Safari's built-in speech engine.
//
// Falls back to `null` on browsers without SpeechRecognition (Firefox mobile,
// some in-app webviews). Callers should not depend on the button rendering;
// the scan page's tap-UI + chat bar still work without voice.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'

type RecognitionLike = {
  start(): void
  stop(): void
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((e: any) => void) | null
  onerror: ((e: any) => void) | null
  onend: (() => void) | null
}

type Props = {
  onTranscriptChange: (text: string) => void
  /** Reset externally (e.g. when the user captures). Increment to clear. */
  resetToken?: number
  className?: string
}

export function VoiceDictation({ onTranscriptChange, resetToken, className }: Props) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recRef = useRef<RecognitionLike | null>(null)
  // Keep the final (confirmed) portion separate from interim so we don't
  // lose committed text when the user pauses mid-sentence.
  const finalTextRef = useRef('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const Ctor =
      (window as any).SpeechRecognition ??
      (window as any).webkitSpeechRecognition
    if (!Ctor) return
    setSupported(true)
    const rec: RecognitionLike = new Ctor()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'
    rec.onresult = (e: any) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalTextRef.current += r[0].transcript
        else interim += r[0].transcript
      }
      const combined = (finalTextRef.current + interim).trim()
      setTranscript(combined)
      onTranscriptChange(combined)
    }
    rec.onerror = (e: any) => {
      setError(e?.error ?? 'mic error')
      setListening(false)
    }
    rec.onend = () => setListening(false)
    recRef.current = rec
    return () => {
      try { rec.stop() } catch { /* already stopped */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // External reset: clear buffer when resetToken changes.
  useEffect(() => {
    if (resetToken === undefined) return
    finalTextRef.current = ''
    setTranscript('')
    onTranscriptChange('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToken])

  const toggle = useCallback(() => {
    const rec = recRef.current
    if (!rec) return
    if (listening) {
      try { rec.stop() } catch { /* noop */ }
      setListening(false)
      return
    }
    setError(null)
    try {
      rec.start()
      setListening(true)
    } catch { /* browsers throw on double-start; ignore */ }
  }, [listening])

  if (!supported) return null

  return (
    <div className={className}>
      <button
        type="button"
        onClick={toggle}
        className={
          'flex items-center gap-2 h-11 px-4 rounded-full text-sm font-medium transition ' +
          (listening
            ? 'bg-[#E5634E] text-white animate-pulse'
            : 'bg-[rgba(255,253,247,0.95)] text-[#1A1410] hover:bg-white')
        }
        aria-pressed={listening}
      >
        {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        {listening ? 'Listening…' : 'Talk while scanning'}
      </button>
      {transcript && (
        <div className="mt-3 max-w-sm rounded-2xl bg-[rgba(26,20,16,0.75)] backdrop-blur-md text-white text-sm px-4 py-2.5 border border-white/10">
          <span className="opacity-70 text-xs uppercase tracking-wider">You said</span>
          <div className="mt-1 leading-relaxed">{transcript}</div>
        </div>
      )}
      {error && (
        <div className="mt-2 text-xs text-[#FFD4CB]">
          Mic error: {error === 'not-allowed' ? 'permission denied' : error}
        </div>
      )}
    </div>
  )
}
