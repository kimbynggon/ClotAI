import json
import logging
import os
import time
from pathlib import Path

from google import genai
from google.genai import types
from google.genai.errors import ClientError
from google.oauth2.credentials import Credentials

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

# 지원 모델 목록 (무료 티어 기준 최신순)
VALID_MODELS = {
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro",
}

# quota 소진 시 순서대로 폴백 (모델별 독립 quota pool)
FALLBACK_MODELS = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
]


def _build_client(api_key: str) -> genai.Client:
    """API 키 형식에 따라 적합한 genai.Client를 반환한다.

    AQ. 형식  → Google OAuth 2.0 액세스 토큰 (Bearer 헤더 방식)
    AIza 형식 → 정적 API Key (?key= 쿼리 파라미터 방식)
    """
    http_opts = types.HttpOptions(timeout=50000)
    if api_key.startswith("AQ."):
        logger.info(
            "[recommend][DIAG] AQ. 형식 토큰 감지 — "
            "OAuth Credentials(Bearer) 방식으로 Gemini 클라이언트 생성"
        )
        creds = Credentials(token=api_key)
        return genai.Client(credentials=creds, http_options=http_opts)

    logger.info("[recommend][DIAG] AIza 형식 API Key — ?key= 쿼리 방식으로 Gemini 클라이언트 생성")
    return genai.Client(api_key=api_key, http_options=http_opts)


def _classify_429(error_msg: str) -> str:
    """429 에러 메시지를 분석해 원인을 반환한다."""
    msg_lower = error_msg.lower()
    if "per_day" in msg_lower or "per day" in msg_lower or "daily" in msg_lower:
        return "DAILY_QUOTA_EXHAUSTED"
    if "free_tier" in msg_lower or "free tier" in msg_lower:
        return "FREE_TIER_QUOTA_EXHAUSTED"
    if "per_minute" in msg_lower or "per minute" in msg_lower:
        return "RATE_LIMIT_PER_MINUTE"
    if "resource_exhausted" in msg_lower:
        return "QUOTA_EXHAUSTED"
    return "RATE_LIMIT_UNKNOWN"

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
    # ── API 키 진단 ──────────────────────────────────────────────────
    api_key = os.environ.get("GOOGLE_API_KEY", "")
    if not api_key:
        logger.error("[recommend][DIAG] GOOGLE_API_KEY 환경변수 누락 — Render 환경변수 확인 필요")
        raise RuntimeError("GOOGLE_API_KEY가 설정되지 않았습니다.")

    key_prefix = api_key[:8] if len(api_key) >= 8 else api_key
    key_len = len(api_key)
    is_oauth_token = api_key.startswith("AQ.")
    is_api_key = api_key.startswith("AIza")
    logger.info(
        f"[recommend][DIAG] API 키 로드 완료 "
        f"prefix={key_prefix}... length={key_len} "
        f"type={'OAuth-AQ' if is_oauth_token else 'APIKey-AIza' if is_api_key else 'UNKNOWN'}"
    )
    if not is_oauth_token and not is_api_key:
        logger.warning(
            "[recommend][DIAG] 알 수 없는 키 형식 — "
            "AQ.(OAuth 토큰) 또는 AIza(API Key) 형식이어야 합니다."
        )

    # ── 모델 폴백 체인 구성 ──────────────────────────────────────────
    primary_model = os.environ.get("AI_MODEL", "gemini-2.0-flash")
    if primary_model not in VALID_MODELS:
        logger.warning(
            f"[recommend][DIAG] 알 수 없는 모델명 model={primary_model} — "
            f"지원 목록: {sorted(VALID_MODELS)}"
        )

    # 환경변수 모델을 선두로, 나머지 폴백 모델을 중복 없이 이어붙임
    model_chain = [primary_model] + [m for m in FALLBACK_MODELS if m != primary_model]
    logger.info(f"[recommend][DIAG] 모델 폴백 체인={model_chain}")

    client = _build_client(api_key)

    system_prompt = _load_prompt("system_prompt.txt")
    user_message = _build_message(req)

    response = None
    for model_name in model_chain:
        logger.info(f"[recommend] Gemini 호출 model={model_name}")
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=user_message,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    max_output_tokens=1024,
                ),
            )
            logger.info(f"[recommend] Gemini 호출 성공 model={model_name}")
            break
        except ClientError as e:
            status = getattr(e, "status_code", 0)
            error_msg = str(e)
            logger.error(
                f"[recommend] ClientError model={model_name} "
                f"status={status} msg={error_msg[:300]}"
            )

            if status == 429:
                cause = _classify_429(error_msg)
                logger.error(f"[recommend][DIAG] 429 원인={cause} model={model_name}")

                if cause in ("DAILY_QUOTA_EXHAUSTED", "FREE_TIER_QUOTA_EXHAUSTED", "QUOTA_EXHAUSTED"):
                    if model_name != model_chain[-1]:
                        next_model = model_chain[model_chain.index(model_name) + 1]
                        logger.warning(
                            f"[recommend][DIAG] quota 소진 — 다음 모델로 폴백 "
                            f"{model_name} → {next_model}"
                        )
                        continue
                    logger.error(
                        "[recommend][DIAG] 모든 모델 quota 소진 — "
                        "내일 UTC 00:00 이후 리셋 또는 Google Cloud 결제 설정 필요"
                    )
                    raise

                elif cause == "RATE_LIMIT_PER_MINUTE":
                    logger.warning(f"[recommend][DIAG] 분당 rate limit model={model_name} — 5초 후 재시도")
                    time.sleep(5)
                    continue

                else:
                    logger.warning(f"[recommend] 429 unknown — 5초 후 재시도 model={model_name}")
                    time.sleep(5)
                    continue

            elif status in (401, 403):
                if api_key.startswith("AQ."):
                    logger.error(
                        f"[recommend][DIAG] 인증 실패 status={status} (AQ. OAuth 토큰) — "
                        "AQ. 토큰이 만료되었습니다. Render 환경변수에 새 토큰을 등록하세요."
                    )
                else:
                    logger.error(
                        f"[recommend][DIAG] 인증 실패 status={status} — "
                        "GOOGLE_API_KEY 재확인 필요"
                    )
                raise

            elif status == 404:
                logger.error(
                    f"[recommend][DIAG] 모델 없음 status=404 model={model_name} — 다음 모델로 폴백"
                )
                continue

            else:
                raise

    if response is None:
        raise RuntimeError("Gemini 응답 없음 — 모든 모델 폴백 실패")

    # ── 응답 원문 로그 ───────────────────────────────────────────────
    raw = response.text.strip() if response.text else ""
    logger.info(
        f"[recommend] Gemini 응답 원문 length={len(raw)} "
        f"preview={raw[:300]!r}"
    )

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
