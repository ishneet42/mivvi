#!/usr/bin/env python3
"""Run the parser eval. Two modes:

  --score-only   (default)  score saved predictions/ vs ground_truth.json
  --rerun                   hit the live parser at --parser-url, save prediction,
                            then score.

Walks eval/fixtures/* and emits per-receipt + aggregate scores.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import requests

from metrics import aggregate, score_receipt

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def load_json(path: Path) -> dict:
    return json.loads(path.read_text())


def run_parser(image_path: Path, parser_url: str) -> tuple[dict, float]:
    t0 = time.time()
    with image_path.open("rb") as f:
        res = requests.post(f"{parser_url}/parse", files={"image": (image_path.name, f, "image/jpeg")}, timeout=60)
    res.raise_for_status()
    return res.json(), (time.time() - t0) * 1000


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--rerun", action="store_true", help="re-parse images through the live parser")
    ap.add_argument("--parser-url", default="http://localhost:8001")
    ap.add_argument("--parser-version", default="gpt-4o-v1")
    args = ap.parse_args()

    fixtures = sorted(p for p in FIXTURES_DIR.iterdir() if p.is_dir())
    if not fixtures:
        print(f"no fixtures in {FIXTURES_DIR}", file=sys.stderr)
        return 1

    scores = []
    print(f"{'fixture':<30} {'f1':>6} {'P':>6} {'R':>6} {'unit_mae':>10} {'line_mae':>10} {'total':>6} {'latency_ms':>10}")
    print("-" * 96)

    for fx in fixtures:
        gt_path = fx / "ground_truth.json"
        if not gt_path.exists():
            print(f"{fx.name:<30} [skip: no ground_truth.json]")
            continue
        gt = load_json(gt_path)

        pred_dir = fx / "predictions"
        pred_dir.mkdir(exist_ok=True)
        pred_path = pred_dir / f"{args.parser_version}.json"

        latency_ms = None
        if args.rerun:
            image_path = next((p for p in fx.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png"}), None)
            if image_path is None:
                print(f"{fx.name:<30} [skip: no image for --rerun]")
                continue
            try:
                pred, latency_ms = run_parser(image_path, args.parser_url)
                pred_path.write_text(json.dumps(pred, indent=2))
            except Exception as e:
                print(f"{fx.name:<30} [error: {e}]")
                continue
        else:
            if not pred_path.exists():
                print(f"{fx.name:<30} [skip: no saved prediction for {args.parser_version}]")
                continue
            pred = load_json(pred_path)

        s = score_receipt(fx.name, args.parser_version, gt, pred)
        scores.append(s)
        lat = f"{latency_ms:.0f}" if latency_ms else "-"
        print(f"{fx.name:<30} {s.f1:>6.2f} {s.precision:>6.2f} {s.recall:>6.2f} "
              f"{s.unit_mae_cents:>10.1f} {s.line_mae_cents:>10.1f} "
              f"{'✓' if s.total_exact else '✗':>6} {lat:>10}")

    print("-" * 96)
    agg = aggregate(scores)
    if agg:
        print(f"\nAggregate over {agg['n']} receipts (parser={args.parser_version}):")
        print(f"  micro F1:              {agg['micro_f1']:.3f}")
        print(f"  micro precision:       {agg['micro_precision']:.3f}")
        print(f"  micro recall:          {agg['micro_recall']:.3f}")
        print(f"  macro F1:              {agg['macro_f1']:.3f}")
        print(f"  mean unit MAE (cents): {agg['mean_unit_mae_cents']:.1f}")
        print(f"  mean line MAE (cents): {agg['mean_line_mae_cents']:.1f}")
        print(f"  total exact match:     {agg['total_exact_rate']:.1%}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
