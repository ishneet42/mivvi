# SnapSplit

GenAI-native fork of Splitwise. Snap a receipt, talk to it, settle the bill.

## Layout

```
snap-split/
├── apps/web/          # forked spliit-app/spliit (add via `git clone`)
├── services/parser/   # FastAPI receipt parser (GPT-4o vision)
└── packages/agent/    # drop-in TS lib for the assignment agent
```

## Bootstrap (this week)

1. Fork `spliit-app/spliit` into `apps/web/`:
   ```
   git clone https://github.com/spliit-app/spliit apps/web
   ```
2. Parser service:
   ```
   cd services/parser
   python -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env   # add OPENAI_API_KEY
   uvicorn main:app --reload --port 8001
   ```
3. Health check: `curl localhost:8001/health`
4. Parse a receipt:
   ```
   curl -F "image=@receipt.jpg" localhost:8001/parse
   ```

## Next

- Wire `apps/web/src/app/snap/` to call `/parse`
- Drop `packages/agent/` into `apps/web/src/lib/agent/`
- Add Prisma migration for `Receipt`, `ReceiptItem`, `Assignment`, `pgvector`
