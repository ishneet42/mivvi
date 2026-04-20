"""GPT-4o vision parser. v1 of the receipt parser."""
from __future__ import annotations

import base64
import os
from dataclasses import dataclass
from typing import Optional

from openai import OpenAI
from schema import Receipt

_client: Optional[OpenAI] = None


def client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    return _client


SYSTEM_PROMPT = """You are a receipt parser. Look at the receipt image and return
structured JSON matching the provided schema exactly.

Rules:
- Extract every line item you can read. Do not invent items.
- Per item, set parsed_confidence in [0,1] reflecting how sure you are of name + price.
- If a field is unreadable, leave it null. Never guess merchant, date, or totals.
- qty defaults to 1. line_total should equal qty * unit_price when both are visible.
- Set top-level confidence to your overall confidence in the parse.
"""


# GPT-4o pricing (per 1M tokens). Override via env if OpenAI pricing changes.
PRICE_INPUT_PER_M = float(os.environ.get("PRICE_INPUT_PER_M", "2.50"))
PRICE_OUTPUT_PER_M = float(os.environ.get("PRICE_OUTPUT_PER_M", "10.00"))


@dataclass
class ParseResult:
    receipt: Receipt
    input_tokens: int
    output_tokens: int
    cost_usd: float
    model: str


def parse_receipt(image_bytes: bytes, mime: str = "image/jpeg") -> ParseResult:
    b64 = base64.b64encode(image_bytes).decode()
    data_url = f"data:{mime};base64,{b64}"
    model = os.environ.get("PARSER_MODEL", "gpt-4o")

    completion = client().beta.chat.completions.parse(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Parse this receipt."},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            },
        ],
        response_format=Receipt,
    )
    usage = completion.usage
    in_tok = usage.prompt_tokens if usage else 0
    out_tok = usage.completion_tokens if usage else 0
    cost = (in_tok * PRICE_INPUT_PER_M + out_tok * PRICE_OUTPUT_PER_M) / 1_000_000
    return ParseResult(
        receipt=completion.choices[0].message.parsed,
        input_tokens=in_tok,
        output_tokens=out_tok,
        cost_usd=cost,
        model=model,
    )
