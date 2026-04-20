"""Gemini vision parser. v2 — replaces the OpenAI gpt-4o version.

Uses gemini-2.5-flash with structured-output (JSON schema) so we get the
same typed Receipt back without a separate validation layer.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional

from google import genai
from google.genai import types

from schema import Receipt

_client: Optional[genai.Client] = None


def client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY not set")
        _client = genai.Client(api_key=api_key)
    return _client


SYSTEM_PROMPT = """You are a receipt parser. Look at the receipt image and
return structured JSON matching the provided schema exactly.

Rules:
- Extract every line item you can read. Do not invent items.
- Per item, set parsed_confidence in [0,1] reflecting how sure you are of name + price.
- If a field is unreadable, leave it null. Never guess merchant, date, or totals.
- qty defaults to 1. line_total should equal qty * unit_price when both are visible.
- Set top-level confidence to your overall confidence in the parse.
"""


# Gemini pricing for 2.5 Flash (per 1M tokens). Tune if Google changes pricing.
PRICE_INPUT_PER_M = float(os.environ.get("PRICE_INPUT_PER_M", "0.30"))
PRICE_OUTPUT_PER_M = float(os.environ.get("PRICE_OUTPUT_PER_M", "2.50"))


@dataclass
class ParseResult:
    receipt: Receipt
    input_tokens: int
    output_tokens: int
    cost_usd: float
    model: str


def parse_receipt(image_bytes: bytes, mime: str = "image/jpeg") -> ParseResult:
    model = os.environ.get("PARSER_MODEL", "gemini-2.5-flash")

    response = client().models.generate_content(
        model=model,
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=mime),
            "Parse this receipt and return the JSON exactly matching the schema.",
        ],
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=Receipt,
        ),
    )

    # Pydantic-parsed response. `.parsed` returns the typed Receipt; fall back
    # to manual JSON parse if Gemini returns text-only for any reason.
    if getattr(response, "parsed", None) is not None:
        receipt = response.parsed
    else:
        import json
        receipt = Receipt.model_validate(json.loads(response.text))

    usage = getattr(response, "usage_metadata", None)
    in_tok = getattr(usage, "prompt_token_count", 0) or 0
    out_tok = getattr(usage, "candidates_token_count", 0) or 0
    cost = (in_tok * PRICE_INPUT_PER_M + out_tok * PRICE_OUTPUT_PER_M) / 1_000_000

    return ParseResult(
        receipt=receipt,
        input_tokens=in_tok,
        output_tokens=out_tok,
        cost_usd=cost,
        model=model,
    )
