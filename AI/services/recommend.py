import json
import logging
import os
import time
from pathlib import Path

from openai import AuthenticationError, BadRequestError, OpenAI, RateLimitError

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

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

FALLBACK_MODELS = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "meta-llama/llama-3.1-8b-instruct:free",
]

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
    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        logger.error("[recommend] OPENROUTER_API_KEY 환경변수 누락")
        raise RuntimeError("OPENROUTER_API_KEY가 설정되지 않았습니다.")

    primary_model = os.environ.get("AI_MODEL", FALLBACK_MODELS[0])
    model_chain = [primary_model] + [m for m in FALLBACK_MODELS if m != primary_model]
    logger.info(f"[recommend] 모델 폴백 체인={model_chain}")

    client = OpenAI(
        api_key=api_key,
        base_url=OPENROUTER_BASE_URL,
    )

    system_prompt = _load_prompt("system_prompt.txt")
    user_message = _build_message(req)

    raw = ""
    for attempt, model_name in enumerate(model_chain):
        logger.info(f"[recommend] OpenRouter 호출 model={model_name} attempt={attempt + 1}")
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                max_tokens=1024,
            )
            raw = response.choices[0].message.content or ""
            logger.info(f"[recommend] 응답 완료 model={model_name} length={len(raw)}")
            break

        except RateLimitError as e:
            wait = 2 ** attempt  # 지수 백오프: 1초 → 2초 → 4초
            logger.error(f"[recommend] RateLimitError model={model_name} wait={wait}s: {e}")
            if attempt < len(model_chain) - 1:
                logger.warning(f"[recommend] {wait}초 후 다음 모델로 폴백")
                time.sleep(wait)
                continue
            raise

        except AuthenticationError as e:
            logger.error(f"[recommend] 인증 실패 — OPENROUTER_API_KEY 확인 필요: {e}")
            raise

        except BadRequestError as e:
            logger.error(f"[recommend] 잘못된 요청 model={model_name}: {e}")
            raise

        except Exception as e:
            logger.error(f"[recommend] 예상치 못한 오류 model={model_name}: {e}", exc_info=True)
            if attempt < len(model_chain) - 1:
                logger.warning(f"[recommend] 다음 모델로 폴백")
                continue
            raise
    else:
        raise RuntimeError("OpenRouter 응답 없음 — 모든 모델 폴백 실패")

    raw = raw.strip()
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
