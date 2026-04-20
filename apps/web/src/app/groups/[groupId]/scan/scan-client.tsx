'use client'

// Mivvi: full-screen live receipt scanner. Camera preview, dimmed overlay
// with a document-frame cutout, flash + gallery buttons, capture CTA,
// and a slide-up bottom sheet on scan success.
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Image as ImageIcon, Zap, ChevronsRight } from 'lucide-react'
import './scan.css'

type Phase = 'preview' | 'scanning' | 'success' | 'error'

type ParsedReceipt = {
  merchant: string | null
  date: string | null
  currency: string
  total: number | null
  items: { name: string; qty: number; unit_price: number; line_total: number; parsed_confidence: number }[]
  confidence: number
}

export function ScanClient({ groupId, groupName, currency }: { groupId: string; groupName: string; currency: string }) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [phase, setPhase] = useState<Phase>('preview')
  const [error, setError] = useState<string | null>(null)
  const [flashOn, setFlashOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [scanResult, setScanResult] = useState<{ receiptId: string; parsed: ParsedReceipt } | null>(null)

  // ── Start camera on mount ────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        })
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        // Check torch (flashlight) capability
        const track = stream.getVideoTracks()[0]
        const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean }
        if (caps.torch) setTorchSupported(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Camera access denied')
      }
    }
    start()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function toggleFlash() {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      await track.applyConstraints({ advanced: [{ torch: !flashOn } as MediaTrackConstraintSet & { torch?: boolean }] })
      setFlashOn((v) => !v)
    } catch { /* torch unsupported */ }
  }

  // ── Capture + parse ──────────────────────────────────────────
  async function capture() {
    if (!videoRef.current || phase !== 'preview') return
    const v = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    if (!blob) return
    await parseBlob(blob)
  }

  async function onGalleryPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await parseBlob(file)
  }

  async function parseBlob(blob: Blob) {
    setPhase('scanning'); setError(null)
    try {
      const fd = new FormData()
      fd.append('image', blob, 'scan.jpg')
      const parseRes = await fetch('/api/parse', { method: 'POST', body: fd })
      if (!parseRes.ok) throw new Error(await parseRes.text())
      const parsed = (await parseRes.json()) as ParsedReceipt

      const persistRes = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ groupId, parsed }),
      })
      if (!persistRes.ok) throw new Error(await persistRes.text())
      const persisted = (await persistRes.json()) as { receiptId: string }

      setScanResult({ receiptId: persisted.receiptId, parsed })
      setPhase('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setPhase('error')
    }
  }

  function splitNow() {
    if (!scanResult) return
    router.push(`/groups/${groupId}/snap?receiptId=${scanResult.receiptId}`)
  }

  const total = scanResult?.parsed.total
  const merchant = scanResult?.parsed.merchant ?? 'Receipt'

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="scan-root">
      <video ref={videoRef} className="scan-video" playsInline muted />
      <div className="scan-dim" />

      {/* Frame cutout */}
      <div className="scan-frame">
        <span className="scan-corner tl" />
        <span className="scan-corner tr" />
        <span className="scan-corner bl" />
        <span className="scan-corner br" />
        {phase === 'scanning' && <div className="scan-sweep" />}
      </div>

      {/* Top chrome */}
      <div className="scan-chrome-top">
        <button className="scan-round-btn" onClick={() => router.back()} aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="scan-status">
          {phase === 'preview' && <>Position the receipt inside the frame</>}
          {phase === 'scanning' && <>Scanning receipt…</>}
          {phase === 'error' && <>Scan failed — try again</>}
          {phase === 'success' && <>Scanned</>}
        </div>
        <button className="scan-round-btn" onClick={toggleFlash} disabled={!torchSupported} aria-label="Toggle flash">
          <Zap className={`w-5 h-5 ${flashOn ? 'text-[#E5634E]' : ''}`} />
        </button>
      </div>

      {/* Bottom chrome (preview state) */}
      {phase === 'preview' && (
        <div className="scan-chrome-bottom">
          <button className="scan-bottom-btn" onClick={() => fileInputRef.current?.click()} aria-label="Pick from gallery">
            <ImageIcon className="w-5 h-5" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={onGalleryPick} className="hidden" />
          <button className="scan-capture" onClick={capture} aria-label="Capture" />
          <button className="scan-bottom-btn" onClick={toggleFlash} disabled={!torchSupported} aria-label="Flash">
            <Zap className={`w-5 h-5 ${flashOn ? 'text-[#E5634E]' : ''}`} />
          </button>
        </div>
      )}

      {/* Success bottom sheet */}
      {phase === 'success' && scanResult && (
        <div className="scan-sheet">
          <div className="scan-sheet-handle" />
          <div className="scan-success-pill">Receipt scanned successfully. Ready to split this bill?</div>
          <div className="scan-merchant">
            <div className="scan-merchant-icon">☕</div>
            <div className="flex-1">
              <div className="text-base font-semibold">{merchant}</div>
              <div className="text-xs opacity-60">{groupName}</div>
            </div>
            <div className="text-base font-semibold tabular-nums">
              {total != null ? `${currency}${total.toFixed(2)}` : '—'}
            </div>
          </div>
          <button className="scan-split-btn" onClick={splitNow}>
            <span className="scan-split-icon"><ChevronsRight className="w-4 h-4" /></span>
            <span className="scan-split-label">Split Now</span>
          </button>
        </div>
      )}

      {/* Error bottom sheet */}
      {phase === 'error' && (
        <div className="scan-sheet">
          <div className="scan-sheet-handle" />
          <div className="scan-error-pill">{error ?? 'Something went wrong while scanning.'}</div>
          <button className="scan-split-btn" onClick={() => { setPhase('preview'); setError(null); setScanResult(null) }}>
            <span className="scan-split-label">Try again</span>
          </button>
        </div>
      )}

      {phase === 'preview' && error && (
        <div className="scan-camera-error">{error}</div>
      )}
    </div>
  )
}
