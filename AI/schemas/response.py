from pydantic import BaseModel
from typing import List, Optional


class OutfitItem(BaseModel):
    top: str
    bottom: str
    outer: Optional[str] = None
    shoes: str
    accessory: Optional[str] = None


class RecommendResponse(BaseModel):
    outfit: OutfitItem
    reason: str
    styleKeyword: str
    colorPalette: List[str]
