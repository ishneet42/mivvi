"""Mivvi receipt parser service. Emits per-request metrics to logs/metrics.jsonl
for the eval harness to aggregate."""
import json
import os
import time
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from models.gpt4o import parse_receipt  # noqa: E402
from schema import Receipt  # noqa: E402

app = FastAPI(title="Mivvi Parser", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

LOG_DIR = Path(os.environ.get("LOG_DIR", "./logs"))
LOG_DIR.mkdir(parents=True, exist_ok=True)
METRICS_PATH = LOG_DIR / "metrics.jsonl"


def _append_metric(row: dict) -> None:
    with METRICS_PATH.open("a") as f:
        f.write(json.dumps(row) + "\n")


@app.get("/health")
def health():
    return {"ok": True, "model": os.environ.get("PARSER_MODEL", "gpt-4o")}


@app.post("/parse", response_model=Receipt)
async def parse(image: UploadFile = File(...)):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(400, "expected an image upload")

    raw = await image.read()
    if len(raw) > 8 * 1024 * 1024:
        raise HTTPException(413, "image too large (>8MB)")

    t0 = time.time()
    try:
        result = parse_receipt(raw, mime=image.content_type)
    except Exception as e:
        elapsed = time.time() - t0
        _append_metric({
            "ts": t0, "ms": elapsed * 1000, "ok": False, "error": str(e),
            "bytes": len(raw),
        })
        raise HTTPException(500, f"parse failed: {e}")
    elapsed = time.time() - t0

    # Log (image, json) for the eval set, and metrics for aggregate reporting.
    stamp = int(t0 * 1000)
    (LOG_DIR / f"{stamp}.jpg").write_bytes(raw)
    (LOG_DIR / f"{stamp}.json").write_text(result.receipt.model_dump_json(indent=2))

    metric = {
        "ts": t0,
        "stamp": stamp,
        "ms": elapsed * 1000,
        "ok": True,
        "model": result.model,
        "input_tokens": result.input_tokens,
        "output_tokens": result.output_tokens,
        "cost_usd": result.cost_usd,
        "bytes": len(raw),
        "items": len(result.receipt.items),
        "confidence": result.receipt.confidence,
    }
    _append_metric(metric)
    print(f"[parse] {stamp} {elapsed:.2f}s items={len(result.receipt.items)} "
          f"conf={result.receipt.confidence:.2f} cost=${result.cost_usd:.4f} "
          f"tokens={result.input_tokens}/{result.output_tokens}")

    return result.receipt
