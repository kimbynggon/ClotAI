from pydantic import BaseModel
from typing import List, Optional


class OutfitItems(BaseModel):
    top: str
    bottom: str
    outer: Optional[str] = None
    shoes: str
    accessory: Optional[str] = None


class RecommendResponse(BaseModel):
    style: str
    colors: List[str]
    items: OutfitItems
    reason: str
