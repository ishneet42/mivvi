# Mivvi

> **Snap. Talk. Settle.**
> An AI-native bill-splitting app. Snap the receipt, tell it who got what in plain English or voice, done.

Mivvi replaces the tedious "type each item + pick each participant" dance of Splitwise with three natural modalities:

- **Snap** — a photo of the receipt. Gemini Vision returns schema-validated line items.
- **Talk** — voice or text. Gemini Live hears you and sees the receipt through your camera; it calls typed tools to assign items, set tip, finalize.
- **Settle** — the ledger updates, balances roll forward, RAG answers natural-language questions about who spent what.

## Stack

| Layer       | Choice                                                 |
| ----------- | ------------------------------------------------------ |
| Web         | Next.js 16 (App Router, Server Components), TypeScript |
| Auth        | Clerk                                                  |
| Database    | Neon Postgres + pgvector                               |
| ORM         | Prisma 6                                               |
| Parser      | FastAPI (Python 3.11) + `google-genai`                 |
| Vision      | `gemini-2.5-flash` w/ Pydantic structured output       |
| Agent       | `gemini-2.5-flash` w/ function calling (9 tools)       |
| RAG         | `gemini-embedding-001` (1536d) + `gemini-2.5-flash`    |
| Voice       | Gemini Live (`gemini-3.1-flash-live-preview`)          |
| Deploy      | Vercel (web) + Render (parser)                         |

## Repo layout

```
mivvi/
├── apps/web/            Next.js app (the product)
│   ├── src/app/         routes (App Router)
│   ├── src/lib/agent/   assignment-agent impl, shared by text + voice
│   ├── src/lib/rag/     balance-assistant embeddings + retrieval
│   └── prisma/          schema + 34 migrations
├── services/parser/     FastAPI receipt parser
├── eval/                ground-truth fixtures + run_*.py harnesses
└── packages/agent/      (deprecated; logic lives in apps/web/src/lib/agent)
```

## Run it locally

### 1. Parser service

```bash
cd services/parser
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # add GEMINI_API_KEY
uvicorn main:app --reload --port 8001
```

Verify:

```bash
curl localhost:8001/health
# {"ok":true,"model":"gemini-2.5-flash"}
```

### 2. Web app

Required env vars (see `apps/web/.env.example` — add the rest from below to `.env`):

```
# database
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=

# auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# llm
GEMINI_API_KEY=
NEXT_PUBLIC_GEMINI_API_KEY=          # same value; the browser uses this for Live

# parser
MIVVI_PARSER_URL=http://localhost:8001   # prod: https://mivvi.onrender.com
```

Then:

```bash
cd apps/web
pnpm install
pnpm dlx prisma migrate dev
pnpm dev
```

Open <http://localhost:3000>.

## Features

| Feature                   | Entry point                    | Notes                                                                                               |
| ------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------- |
| Create a group            | `/groups/create`               | Creator is auto-seeded as OWNER + first participant                                                 |
| Add friends               | Group → Members → Generate code| 6-char code (e.g. `ABC-X7K`) — share verbally, they enter it at `/join`                             |
| Scan a receipt            | Group → Scan                   | Live camera or gallery → parser → Prisma → shows line items                                         |
| Split by voice + video    | Scan → Talk to AI              | Gemini Live sees the receipt and hears you; calls assignment tools; speaks back                     |
| Split by text             | Scan → Narrate → Snap page     | Same tool-calling agent, typed instead of spoken                                                    |
| Tap-assign                | Snap page                      | Manual fallback — tap item → tap person                                                             |
| Finalize                  | Snap page                      | Writes Expense + ExpensePaidFor rows; balances update                                               |
| Ask your expenses         | `/ask`                         | pgvector RAG over every expense in groups you own; citations inline                                 |
| Preferences               | `/profile` → Dietary tags      | "vegetarian", "no-alcohol" etc; agent applies narrow exclusions to matching items on future splits  |
| Emoji avatars             | `/profile`                     | Deterministic gradient backgrounds; scrollable picker                                               |

## Architecture

See [`docs/architecture.png`](docs/architecture.png) for the diagram.

Key decisions:

1. **One tool layer** (`apps/web/src/lib/agent/impl.ts`) for tap, text, and voice. Assignment semantics are identical across modalities.
2. **Ephemeral tokens + direct-key fallback** for Gemini Live. Ephemeral is the default; if `NEXT_PUBLIC_GEMINI_API_KEY` is set, the browser skips the mint and opens the WebSocket directly (matches Google's reference demo).
3. **Parser isolated as a service** — if we swap Gemini for another vision model, only the parser changes. Web + agent + RAG untouched.
4. **Preferences as narrow exclusions** — "no alcohol" applies only to alcohol-matched items, not to all splits; the agent's system prompt teaches the scope rule.

## Evaluation

Harnesses live in `eval/`. To reproduce:

```bash
# parser: item-level F1, MAE on prices, total match ±$0.01
python eval/run_parser_eval.py

# agent: exact-match and item-level match on 10 scripted scenarios
python eval/run_agent_eval.py

# aggregate LLM cost/latency from /tmp/mivvi-llm.jsonl
python eval/aggregate_llm.py
```

Latest results: see `eval/reports/`.

## Deploy

- **Web**: Vercel. Root Directory = `apps/web`. `prisma migrate deploy` runs in `vercel-build`.
- **Parser**: Render. Dockerfile at `services/parser/Dockerfile`. Healthcheck on `/health`.

Required env var mapping is documented in `DEPLOY.md`.

## Credits

Forked from [spliit-app/spliit](https://github.com/spliit-app/spliit) — kept the Prisma schema and tRPC plumbing, replaced the UX, parser, and agent entirely with an AI-native flow.

Built for a GenAI graduate course final project, April 2026.
