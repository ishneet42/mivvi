// Mivvi: proxy multipart receipt upload to the FastAPI parser. Auth-gated.
import { NextRequest, NextResponse } from 'next/server'
import { AuthError, requireUser } from '@/lib/authz'

export const runtime = 'nodejs'

const PARSER_URL = process.env.MIVVI_PARSER_URL ?? process.env.SNAPSPLIT_PARSER_URL ?? 'http://host.docker.internal:8001'

export async function POST(req: NextRequest) {
  try {
    await requireUser()
  } catch (e) {
    const err = e as AuthError
    return NextResponse.json({ error: err.message }, { status: err.status ?? 401 })
  }

  const form = await req.formData()
  const image = form.get('image')
  if (!(image instanceof File)) {
    return NextResponse.json({ error: 'image field required' }, { status: 400 })
  }

  const upstream = new FormData()
  upstream.append('image', image, (image as File).name || 'receipt.jpg')

  const res = await fetch(`${PARSER_URL}/parse`, { method: 'POST', body: upstream })
  const text = await res.text()
  return new NextResponse(text, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  })
}
