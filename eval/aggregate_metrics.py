#!/usr/bin/env python3
"""Aggregate parser service metrics for the report.

Reads services/parser/logs/metrics.jsonl (one line per /parse call) and prints
summary stats: p50/p95 latency, mean cost, mean tokens, success rate.
"""
from __future__ import annotations

import argparse
import json
import statistics
import sys
from pathlib import Path


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--metrics", default="../services/parser/logs/metrics.jsonl")
    args = ap.parse_args()

    path = Path(args.metrics)
    if not path.exists():
        print(f"no metrics at {path}", file=sys.stderr)
        return 1

    rows = []
    for line in path.read_text().splitlines():
        if not line.strip():
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue

    if not rows:
        print("no rows")
        return 0

    ok = [r for r in rows if r.get("ok")]
    errs = len(rows) - len(ok)
    latencies = [r["ms"] for r in ok]
    costs = [r["cost_usd"] for r in ok]
    in_tok = [r["input_tokens"] for r in ok]
    out_tok = [r["output_tokens"] for r in ok]

    def pct(vals, p):
        if not vals: return 0
        s = sorted(vals)
        k = max(0, min(len(s) - 1, int(round((p / 100) * (len(s) - 1)))))
        return s[k]

    print(f"Parser metrics — {len(rows)} calls ({errs} errors, {len(ok)/len(rows):.1%} success)\n")
    if ok:
        print(f"  latency   p50 {pct(latencies, 50):.0f} ms   p95 {pct(latencies, 95):.0f} ms   mean {statistics.mean(latencies):.0f} ms")
        print(f"  cost      mean ${statistics.mean(costs):.4f}   total ${sum(costs):.2f}")
        print(f"  tokens    mean in {statistics.mean(in_tok):.0f}   out {statistics.mean(out_tok):.0f}")
        print(f"  items     mean {statistics.mean(r['items'] for r in ok):.1f}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
