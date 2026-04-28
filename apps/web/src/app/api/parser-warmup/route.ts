// Mivvi: pre-warm the FastAPI parser container.
//
// Render's free tier spins containers down after ~15 minutes of idle, and a
// cold start can take 20–30s. We hit /health when the user opens the scan
// page so by the time they actually tap capture the container is awake and
// the parse is just the model latency (~2–4s).
//
// Best-effort: any failure here is silently swallowed; the actual parse
// path will surface a real error if needed.
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const PARSER_URL =
  process.env.MIVVI_PARSER_URL ?? 'http://host.docker.internal:8001'

export async function GET() {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 30_000)
    const res = await fetch(`${PARSER_URL}/health`, { signal: ctrl.signal })
    clearTimeout(timer)
    return NextResponse.json({
      ok: res.ok,
      parser: res.ok ? await res.json() : null,
    }, { headers: { 'cache-control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }, { status: 200 })  // 200 even on error — warmup is best-effort
  }
}
