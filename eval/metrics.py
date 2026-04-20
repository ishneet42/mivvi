"""Scoring functions for parser evaluation.

All functions operate on plain dicts matching the parser's Receipt schema.
Prices in input JSON are floats (dollars); we convert to cents internally
so fixture files stay human-readable.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from rapidfuzz import fuzz

NAME_MATCH_THRESHOLD = 70  # rapidfuzz ratio 0-100; 70 ~= "same item, slight OCR drift"
TOTAL_TOLERANCE_CENTS = 1


def _cents(x: float | int | None) -> int | None:
    return None if x is None else round(float(x) * 100)


@dataclass
class ItemMatch:
    gt_idx: int
    pred_idx: int
    name_score: float
    gt_line_cents: int
    pred_line_cents: int
    gt_unit_cents: int
    pred_unit_cents: int


def match_items(gt_items: list[dict[str, Any]], pred_items: list[dict[str, Any]]) -> tuple[list[ItemMatch], list[int], list[int]]:
    """Greedy bipartite matching by fuzzy name score. Returns
    (matches, unmatched_gt_indices, unmatched_pred_indices)."""
    scores: list[tuple[float, int, int]] = []
    for gi, g in enumerate(gt_items):
        for pi, p in enumerate(pred_items):
            s = fuzz.token_sort_ratio(g["name"], p["name"])
            if s >= NAME_MATCH_THRESHOLD:
                scores.append((s, gi, pi))
    scores.sort(reverse=True)  # highest score first
    used_gt, used_pred = set(), set()
    matches: list[ItemMatch] = []
    for s, gi, pi in scores:
        if gi in used_gt or pi in used_pred:
            continue
        used_gt.add(gi); used_pred.add(pi)
        g, p = gt_items[gi], pred_items[pi]
        matches.append(ItemMatch(
            gt_idx=gi, pred_idx=pi, name_score=s,
            gt_line_cents=_cents(g.get("line_total")) or 0,
            pred_line_cents=_cents(p.get("line_total")) or 0,
            gt_unit_cents=_cents(g.get("unit_price")) or 0,
            pred_unit_cents=_cents(p.get("unit_price")) or 0,
        ))
    unmatched_gt = [i for i in range(len(gt_items)) if i not in used_gt]
    unmatched_pred = [i for i in range(len(pred_items)) if i not in used_pred]
    return matches, unmatched_gt, unmatched_pred


@dataclass
class ReceiptScore:
    name: str
    parser_version: str
    tp: int
    fp: int
    fn: int
    precision: float
    recall: float
    f1: float
    unit_mae_cents: float
    line_mae_cents: float
    total_exact: bool
    total_delta_cents: int | None


def score_receipt(name: str, parser_version: str, gt: dict[str, Any], pred: dict[str, Any]) -> ReceiptScore:
    matches, umg, ump = match_items(gt["items"], pred["items"])
    tp = len(matches); fp = len(ump); fn = len(umg)
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall    = tp / (tp + fn) if (tp + fn) else 0.0
    f1        = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0

    if matches:
        unit_mae = sum(abs(m.gt_unit_cents - m.pred_unit_cents) for m in matches) / len(matches)
        line_mae = sum(abs(m.gt_line_cents - m.pred_line_cents) for m in matches) / len(matches)
    else:
        unit_mae = line_mae = 0.0

    gt_total_c   = _cents(gt.get("total"))
    pred_total_c = _cents(pred.get("total"))
    if gt_total_c is None or pred_total_c is None:
        total_exact = False
        total_delta = None
    else:
        total_delta = pred_total_c - gt_total_c
        total_exact = abs(total_delta) <= TOTAL_TOLERANCE_CENTS

    return ReceiptScore(
        name=name, parser_version=parser_version,
        tp=tp, fp=fp, fn=fn,
        precision=precision, recall=recall, f1=f1,
        unit_mae_cents=unit_mae, line_mae_cents=line_mae,
        total_exact=total_exact, total_delta_cents=total_delta,
    )


def aggregate(scores: list[ReceiptScore]) -> dict[str, float]:
    if not scores:
        return {}
    n = len(scores)
    tp = sum(s.tp for s in scores); fp = sum(s.fp for s in scores); fn = sum(s.fn for s in scores)
    micro_p = tp / (tp + fp) if (tp + fp) else 0.0
    micro_r = tp / (tp + fn) if (tp + fn) else 0.0
    micro_f1 = 2 * micro_p * micro_r / (micro_p + micro_r) if (micro_p + micro_r) else 0.0
    return {
        "n": n,
        "micro_precision": micro_p,
        "micro_recall": micro_r,
        "micro_f1": micro_f1,
        "macro_f1": sum(s.f1 for s in scores) / n,
        "mean_unit_mae_cents": sum(s.unit_mae_cents for s in scores) / n,
        "mean_line_mae_cents": sum(s.line_mae_cents for s in scores) / n,
        "total_exact_rate": sum(1 for s in scores if s.total_exact) / n,
    }
