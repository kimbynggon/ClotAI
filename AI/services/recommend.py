import json
import logging
import os
from pathlib import Path

import google.generativeai as genai
from schemas.request import RecommendRequest

logger = logging.getLogger(__name__)

PROMPT_DIR = Path(__file__).parent.parent / "prompts"

GENDER_MAP = {"male": "남성", "female": "여성", "other": "기타"}
BODY_TYPE_MAP = {
    "rectangle": "직사각형형(균형형)",
    "triangle": "삼각형형(하체발달형)",
    "inverted_triangle": "역삼각형형(상체발달형)",
    "hourglass": "모래시계형",
    "oval": "타원형",
}
BUDGET_MAP = {"low": "저가 (3만원 이하)", "mid": "중가 (3~10만원)", "high": "고가 (10만원 이상)"}
SEASON_MAP = {"spring": "봄", "summer": "여름", "autumn": "가을", "winter": "겨울"}

JSON_SCHEMA = """
다음 JSON 형식으로만 응답하세요 (코드블록 없이 순수 JSON):
{
  "outfit": {
    "top": "구체적인 상의 설명 (색상, 소재, 핏 포함)",
    "bottom": "구체적인 하의 설명",
    "outer": "아우터 설명 (필요 없으면 null)",
    "shoes": "신발 설명",
    "accessory": "액세서리 설명 (없으면 null)"
  },
  "reason": "이 코디를 추천하는 이유 (날씨·체형·스타일을 각각 언급, 2~3문장)",
  "styleKeyword": "이 코디의 핵심 스타일 키워드 (예: 캐주얼 미니멀)",
  "colorPalette": ["메인 색상", "서브 색상", "포인트 색상"]
}
"""


def _load_prompt(filename: str) -> str:
    path = PROMPT_DIR / filename
    logger.info(f"[recommend] 프롬프트 로드: {path}")
    return path.read_text(encoding="utf-8")


def _build_message(req: RecommendRequest) -> str:
    p = req.profile
    w = req.weather

    precipitation_info = "없음"
    if w.is_raining:
        precipitation_info = "비 내림"
    elif w.is_snowing:
        precipitation_info = "눈 내림"

    template = _load_prompt("ootd_prompt_v1.txt")
    user_section = template.format(
        gender=GENDER_MAP.get(p.gender or "", p.gender or "미입력"),
        height=f"{p.height}cm" if p.height else "미입력",
        weight=f"{p.weight}kg" if p.weight else "미입력",
        body_type=BODY_TYPE_MAP.get(p.body_type or "", p.body_type or "미입력"),
        style_tags=", ".join(p.style_tags) if p.style_tags else "없음",
        color_tags=", ".join(p.color_tags) if p.color_tags else "없음",
        budget_tier=BUDGET_MAP.get(p.budget_tier or "", p.budget_tier or "미입력"),
        temperature=w.temperature,
        feels_like=w.feels_like,
        weather_description=w.weather_description,
        season=SEASON_MAP.get(w.season, w.season),
        precipitation_info=precipitation_info,
    )

    return user_section + JSON_SCHEMA


def generate_recommendation(req: RecommendRequest) -> dict:
    api_key = os.environ.get("GOOGLE_API_KEY", "")
    if not api_key:
        logger.error("[recommend] GOOGLE_API_KEY 환경변수가 설정되지 않았습니다!")
        raise RuntimeError("GOOGLE_API_KEY가 설정되지 않았습니다. Render 환경변수를 확인해주세요.")

    genai.configure(api_key=api_key)

    system_prompt = _load_prompt("system_prompt.txt")
    user_message = _build_message(req)
    model_name = os.environ.get("AI_MODEL", "gemini-2.0-flash")

    logger.info(f"[recommend] 모델 호출 시작 model={model_name}")

    model = genai.GenerativeModel(
        model_name,
        system_instruction=system_prompt,
    )

    response = model.generate_content(
        user_message,
        generation_config=genai.types.GenerationConfig(max_output_tokens=1024),
        request_options={"timeout": 30},
    )

    raw = response.text.strip()
    logger.info(f"[recommend] Gemini 원본 응답 길이={len(raw)}")

    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        logger.warning(f"[recommend] JSON 파싱 실패 err={e} raw={raw[:200]}")
        return {
            "outfit": {
                "top": "흰색 반팔 티셔츠",
                "bottom": "네이비 슬랙스",
                "outer": None,
                "shoes": "흰색 스니커즈",
                "accessory": None,
            },
            "reason": "AI 응답 파싱에 실패하여 기본 추천을 제공합니다.",
            "styleKeyword": "캐주얼",
            "colorPalette": ["white", "navy", "gray"],
        }
