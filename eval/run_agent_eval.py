#!/usr/bin/env python3
"""Run the assignment-agent eval.

For each scenario in eval/agent_fixtures/:
  1. Seed a group + receipt via /api/eval/seed
  2. POST the natural-language message to /api/agent
  3. Read back assignments via /api/receipts/[id]
  4. Score vs expected (exact match on item -> sorted(participant_names))
  5. Cleanup

Prints per-scenario + aggregate metrics. Expects:
  - Mivvi app at http://localhost:3000
  - MIVVI_EVAL_TOKEN in eval/.env (auto-generated on setup)
"""
from __future__ import annotations

import json
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path

import requests

FIXTURES_DIR = Path(__file__).parent / "agent_fixtures"
BASE = os.environ.get("MIVVI_BASE_URL", "http://localhost:3000")


def load_env() -> str:
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())
    token = os.environ.get("MIVVI_EVAL_TOKEN")
    if not token:
        raise SystemExit("MIVVI_EVAL_TOKEN not set in eval/.env or env")
    return token


@dataclass
class ScenarioResult:
    name: str
    description: str
    exact_match: bool
    item_hits: int
    item_total: int
    rounds: int
    tool_calls: list[str]
    ms: float
    narration: str
    missing: list[dict]
    extra: list[dict]


def parse_stream(body: bytes) -> tuple[str, dict]:
    """Split agent response into narration + trailing __AGENT_META__{...}."""
    text = body.decode("utf-8", errors="replace")
    marker = "\n\n__AGENT_META__"
    if marker in text:
        pre, meta_raw = text.rsplit(marker, 1)
        try:
            meta = json.loads(meta_raw)
        except json.JSONDecodeError:
            meta = {}
        return pre, meta
    return text, {}


def run_scenario(name: str, scenario: dict, token: str) -> ScenarioResult:
    headers = {"X-Eval-Token": token, "Content-Type": "application/json"}

    # Seed
    seed = requests.post(f"{BASE}/api/eval/seed", json={
        "group_name": scenario["group_name"],
        "participants": scenario["participants"],
        "receipt": scenario["receipt"],
    }, headers=headers, timeout=30)
    seed.raise_for_status()
    seeded = seed.json()
    group_id, receipt_id = seeded["groupId"], seeded["receiptId"]
    people_by_id = {p["id"]: p["name"] for p in seeded["participants"]}

    try:
        # Run agent
        t0 = time.time()
        r = requests.post(f"{BASE}/api/agent", json={
            "receiptId": receipt_id,
            "groupId": group_id,
            "message": scenario["message"],
        }, headers=headers, timeout=120)
        r.raise_for_status()
        narration, meta = parse_stream(r.content)
        ms = (time.time() - t0) * 1000

        # Read assignments
        rr = requests.get(f"{BASE}/api/receipts/{receipt_id}", headers=headers, timeout=30)
        rr.raise_for_status()
        state = rr.json()
        got = {
            it["name"]: sorted(people_by_id[pid] for pid in it["assignedTo"] if pid in people_by_id)
            for it in state["items"]
        }

        # Score: exact match on item -> sorted([names])
        expected = {e["item"]: sorted(e["people"]) for e in scenario["expected"]}
        hits = sum(1 for k, v in expected.items() if got.get(k) == v)
        total = len(expected)
        missing = [{"item": k, "expected": v, "got": got.get(k, [])} for k, v in expected.items() if got.get(k) != v]
        extra = [{"item": k, "got": v} for k, v in got.items() if k not in expected and v]

        return ScenarioResult(
            name=name,
            description=scenario.get("description", ""),
            exact_match=(hits == total and not extra),
            item_hits=hits,
            item_total=total,
            rounds=meta.get("rounds", 0),
            tool_calls=meta.get("tool_calls", []),
            ms=meta.get("ms", ms),
            narration=narration.strip()[:200],
            missing=missing,
            extra=extra,
        )
    finally:
        requests.post(f"{BASE}/api/eval/cleanup", json={"groupId": group_id}, headers=headers, timeout=30)


def main() -> int:
    token = load_env()
    fixtures = sorted(p for p in FIXTURES_DIR.iterdir() if p.is_dir())
    if not fixtures:
        print(f"no fixtures in {FIXTURES_DIR}", file=sys.stderr)
        return 1

    results: list[ScenarioResult] = []
    print(f"{'scenario':<36} {'match':>6} {'items':>8} {'rounds':>7} {'calls':>6} {'ms':>6}")
    print("-" * 78)
    for fx in fixtures:
        sc_path = fx / "scenario.json"
        if not sc_path.exists(): continue
        scenario = json.loads(sc_path.read_text())
        try:
            r = run_scenario(fx.name, scenario, token)
        except Exception as e:
            print(f"{fx.name:<36}   ERR    {e}")
            continue
        results.append(r)
        tag = "✓" if r.exact_match else "✗"
        print(f"{fx.name:<36} {tag:>6} {r.item_hits}/{r.item_total:<5} "
              f"{r.rounds:>7} {len(r.tool_calls):>6} {r.ms:>6.0f}")

    print("-" * 78)
    if not results:
        return 0

    n = len(results)
    exact = sum(1 for r in results if r.exact_match)
    item_hits = sum(r.item_hits for r in results)
    item_total = sum(r.item_total for r in results)
    mean_rounds = sum(r.rounds for r in results) / n
    mean_calls = sum(len(r.tool_calls) for r in results) / n
    mean_ms = sum(r.ms for r in results) / n

    print(f"\nAggregate over {n} scenarios:")
    print(f"  exact-match rate:      {exact/n:.1%} ({exact}/{n})")
    print(f"  item-level accuracy:   {item_hits/item_total:.1%} ({item_hits}/{item_total})")
    print(f"  mean tool-call rounds: {mean_rounds:.2f}")
    print(f"  mean tool calls:       {mean_calls:.2f}")
    print(f"  mean latency ms:       {mean_ms:.0f}")

    print("\nFailures (top 5):")
    for r in results:
        if r.exact_match: continue
        print(f"  {r.name}")
        for m in r.missing[:3]:
            print(f"    - {m['item']}: expected {m['expected']}, got {m['got']}")

    return 0 if exact == n else 2


if __name__ == "__main__":
    sys.exit(main())
