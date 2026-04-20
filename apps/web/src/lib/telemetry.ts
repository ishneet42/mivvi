// Mivvi: per-LLM-call telemetry. Writes a JSON line per call to
// /tmp/mivvi-llm.jsonl inside the web container, which `eval/aggregate_llm.py`
// reads for the report's cost/latency table.
//
// Pricing lookup covers the models we actually use. OpenAI adjusts these; keep
// in sync with services/parser/models/gpt4o.py.
//
// fs/path are dynamically imported inside logLlmCall so bundlers treat this
// module as safe to reference from any runtime; the actual write only runs
// server-side when the dynamic import resolves in Node.

// Prices per 1M tokens (USD). Override any of these via env.
const PRICES: Record<string, { in: number; out: number }> = {
  'gpt-4o':                 { in: 2.5,  out: 10   },
  'gpt-4o-mini':            { in: 0.15, out: 0.6  },
  'gemini-2.5-flash':       { in: 0.30, out: 2.50 },
  'gemini-2.5-pro':         { in: 1.25, out: 10.0 },
  'text-embedding-3-small': { in: 0.02, out: 0    },
  'gemini-embedding-001':   { in: 0.15, out: 0    },
}

export type LlmCall = {
  ts: number
  route: string            // e.g. '/api/agent', '/api/ask', 'embed'
  model: string
  ok: boolean
  ms: number
  input_tokens?: number
  output_tokens?: number
  cost_usd?: number
  tool_calls?: number       // agent-specific
  rounds?: number           // agent-specific
  error?: string
}

export function costFor(model: string, input_tokens: number, output_tokens: number): number {
  const p = PRICES[model]
  if (!p) return 0
  return (input_tokens * p.in + output_tokens * p.out) / 1_000_000
}

const LOG_PATH = process.env.MIVVI_LLM_LOG ?? '/tmp/mivvi-llm.jsonl'

export async function logLlmCall(call: LlmCall): Promise<void> {
  try {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    await fs.mkdir(path.dirname(LOG_PATH), { recursive: true })
    await fs.appendFile(LOG_PATH, JSON.stringify(call) + '\n')
  } catch {
    // best-effort; never break a user request over telemetry
  }
}
