# Mivvi Parser Eval Harness

What it does: scores the receipt parser's output against hand-labeled ground
truth, and prints aggregate metrics suitable for the course report.

## Metrics

Per plan §10:
- **Item-level F1** on item name (fuzzy match, Levenshtein-based, threshold 0.7)
- **MAE** on `unit_price` and `line_total` across matched items
- **Total exact match** — did the parser's `total` match ground truth within $0.01?
- **Parser latency** (ms per receipt) and **cost** ($ per receipt) — logged by the
  FastAPI service, aggregated here.

## Directory layout

```
eval/
├── fixtures/
│   └── <name>/
│       ├── image.jpg              # optional, only needed to re-run the parser
│       ├── ground_truth.json      # hand-labeled
│       └── predictions/           # parser outputs to score, keyed by version
│           └── gpt-4o-v1.json
├── run_parser_eval.py             # main runner
├── metrics.py                     # scoring functions
└── requirements.txt
```

## Ground truth format

Matches the parser's `Receipt` schema. Example:

```json
{
  "merchant": "Brew District Café",
  "date": "2026-03-14",
  "currency": "USD",
  "items": [
    { "name": "Flat White",  "qty": 1, "unit_price": 4.50, "line_total": 4.50 },
    { "name": "Avocado Toast", "qty": 2, "unit_price": 12.00, "line_total": 24.00 }
  ],
  "subtotal": 28.50,
  "tax": 2.57,
  "tip": 5.00,
  "total": 36.07
}
```

## Running

```bash
cd eval
pip install -r requirements.txt

# Score existing saved predictions (no API cost):
python run_parser_eval.py --score-only

# Re-parse all fixtures through the live FastAPI service:
python run_parser_eval.py --rerun --parser-url http://localhost:8001
```

Output: per-fixture scores + an aggregate table at the end. Pipe to `tee
results_$(date +%Y%m%d).txt` to archive for the report.

## Adding a real receipt

1. Drop `image.jpg` in `fixtures/<name>/`.
2. Hand-label `ground_truth.json` matching the schema above.
3. Run with `--rerun` once to save predictions.
4. Commit the whole directory to git so results are reproducible.

Target: **30 real receipts** for the report (plan §10 item 1).
