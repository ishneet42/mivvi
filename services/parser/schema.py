from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class Item(BaseModel):
    name: str
    qty: float = 1
    unit_price: float
    line_total: float
    parsed_confidence: float = Field(ge=0, le=1, default=1.0)


class Receipt(BaseModel):
    merchant: Optional[str] = None
    date: Optional[str] = None
    currency: str = "USD"
    items: List[Item]
    subtotal: Optional[float] = None
    tax: Optional[float] = None
    tip: Optional[float] = None
    total: Optional[float] = None
    confidence: float = Field(ge=0, le=1, default=1.0)
