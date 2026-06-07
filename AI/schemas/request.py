from pydantic import BaseModel
from typing import List, Optional


class ProfileData(BaseModel):
    gender: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    body_type: Optional[str] = None
    style_tags: List[str] = []
    color_tags: List[str] = []
    budget_tier: Optional[str] = None


class WeatherData(BaseModel):
    temperature: float
    feels_like: float
    precipitation: float = 0
    humidity: float = 0
    wind_speed: float = 0
    weather_description: str
    season: str
    is_raining: bool
    is_snowing: bool


class RecommendRequest(BaseModel):
    profile: ProfileData
    weather: WeatherData
