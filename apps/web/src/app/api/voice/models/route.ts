// Diagnostic: enumerate which Gemini models this API key can reach, and
// specifically which of them expose `bidiGenerateContent` (= Live API).
//
// Usage: sign in, then visit /api/voice/models in the browser.
// The response tells you exactly what model name to put in
// NEXT_PUBLIC_GEMINI_LIVE_MODEL (if any).
import { NextResponse } from 'next/server'
import { AuthError, requireUser } from '@/lib/authz'

export const runtime = 'nodejs'

type Model = {
  name: string
  displayName?: string
  supportedGenerationMethods?: string[]
}

async function listModels(apiKey: string, apiVersion: 'v1alpha' | 'v1beta') {
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models?key=${apiKey}&pageSize=1000`
  const res = await fetch(url)
  if (!res.ok) {
    return { error: `HTTP ${res.status}: ${await res.text()}`, models: [] as Model[] }
  }
  const j = (await res.json()) as { models?: Model[] }
  return { error: null, models: j.models ?? [] }
}

export async function GET() {
  try { await requireUser() } catch (e) {
    const err = e as AuthError
    return NextResponse.json({ error: err.message }, { status: err.status ?? 401 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })
  }

  // Query both v1alpha and v1beta — Live lives on v1alpha, but we show
  // v1beta too so you can sanity-check the key works at all.
  const [alpha, beta] = await Promise.all([
    listModels(apiKey, 'v1alpha'),
    listModels(apiKey, 'v1beta'),
  ])

  const summarize = (res: { error: string | null; models: Model[] }) => {
    if (res.error) return { error: res.error }
    const liveCapable = res.models.filter((m) =>
      m.supportedGenerationMethods?.some((x) => /bidi|live/i.test(x)),
    )
    return {
      totalModels: res.models.length,
      liveCapable: liveCapable.map((m) => ({
        name: m.name,
        displayName: m.displayName,
        methods: m.supportedGenerationMethods,
      })),
      allModelNames: res.models.map((m) => m.name),
    }
  }

  return NextResponse.json({
    tip:
      'If "liveCapable" is empty in both v1alpha and v1beta, this API key has ' +
      'no Live access. Generate a new key at https://aistudio.google.com/app/apikey ' +
      'on a project with Live enabled. Otherwise copy any "name" from liveCapable ' +
      'into NEXT_PUBLIC_GEMINI_LIVE_MODEL on Vercel (strip the "models/" prefix).',
    v1alpha: summarize(alpha),
    v1beta: summarize(beta),
  }, { headers: { 'cache-control': 'no-store' } })
}
