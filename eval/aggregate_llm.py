#!/usr/bin/env python3
"""Aggregate Mivvi LLM telemetry for the report's cost/latency table.

Reads /tmp/mivvi-llm.jsonl (one line per LLM call from the web app) and
groups by route + model. Copy the file out of the container with:
  docker compose cp web-app-1:/tmp/mivvi-llm.jsonl ./mivvi-llm.jsonl
"""
from __future__ import annotations

import argparse
import json
import statistics
import sys
from collections import defaultdict
from pathlib import Path


def pct(vals, p):
    if not vals: return 0.0
    s = sorted(vals)
    k = max(0, min(len(s) - 1, int(round((p / 100) * (len(s) - 1)))))
    return s[k]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--log", default="./mivvi-llm.jsonl",
                    help="JSONL copy of /tmp/mivvi-llm.jsonl from the container")
    args = ap.parse_args()

    path = Path(args.log)
    if not path.exists():
        print(f"no log at {path} — copy from container first:", file=sys.stderr)
        print("  docker compose cp web-app-1:/tmp/mivvi-llm.jsonl ./mivvi-llm.jsonl", file=sys.stderr)
        return 1

    rows = []
    for line in path.read_text().splitlines():
        if not line.strip(): continue
        try: rows.append(json.loads(line))
        except json.JSONDecodeError: continue

    if not rows:
        print("no rows"); return 0

    # Group by (route, model)
    groups: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for r in rows:
        groups[(r.get("route", "?"), r.get("model", "?"))].append(r)

    print(f"Mivvi LLM telemetry — {len(rows)} calls\n")
    print(f"{'route':<14} {'model':<28} {'n':>5} {'p50ms':>7} {'p95ms':>7} "
          f"{'mean_$':>8} {'total_$':>8} {'in_tok':>8} {'out_tok':>8}")
    print("-" * 107)
    grand_total = 0.0
    for (route, model), rs in sorted(groups.items()):
        latencies = [r["ms"] for r in rs if r.get("ok")]
        costs = [r.get("cost_usd", 0) or 0 for r in rs]
        in_tok = [r.get("input_tokens", 0) or 0 for r in rs]
        out_tok = [r.get("output_tokens", 0) or 0 for r in rs]
        total_cost = sum(costs); grand_total += total_cost
        print(f"{route:<14} {model:<28} {len(rs):>5} "
              f"{pct(latencies, 50):>7.0f} {pct(latencies, 95):>7.0f} "
              f"{statistics.mean(costs) if costs else 0:>8.5f} "
              f"{total_cost:>8.4f} "
              f"{statistics.mean(in_tok) if in_tok else 0:>8.0f} "
              f"{statistics.mean(out_tok) if out_tok else 0:>8.0f}")

    # Agent-specific: rounds + tool calls
    agent_rows = [r for r in rows if r.get("route") == "/api/agent"]
    if agent_rows:
        rounds = [r.get("rounds", 0) for r in agent_rows]
        tc = [r.get("tool_calls", 0) for r in agent_rows]
        print(f"\nAgent specifics: mean rounds {statistics.mean(rounds):.2f}, "
              f"mean tool calls {statistics.mean(tc):.2f}")

    print(f"\nGrand total: ${grand_total:.4f}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
