import json
import logging
import os
import time
from abc import ABC, abstractmethod
from pathlib import Path

from openai import AuthenticationError, BadRequestError, OpenAI, RateLimitError

from schemas.request import RecommendRequest

logger = logging.getLogger(__name__)

PROMPT_DIR = Path(__file__).parent.parent / "prompts"
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
GROQ_BASE_URL = "https://api.groq.com/openai/v1"

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

# Groq 모델 체인 (무료, 빠름)
GROQ_MODEL_CHAIN = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
]

# OpenRouter 폴백 체인 (Groq 실패 시)
OPENROUTER_MODEL_CHAIN = [
    "meta-llama/llama-3.1-8b-instruct:free",
    "mistralai/mistral-7b-instruct:free",
]

JSON_SCHEMA = """
다음 JSON 형식으로만 응답하세요 (코드블록 없이 순수 JSON). 모든 값은 반드시 한국어로만 작성하세요:
{
  "style": "스타일 이름 (한국어로. 예: 서머 캐주얼, 모던 미니멀, 스트릿 캐주얼)",
  "colors": ["메인 색상 (한국어)", "서브 색상 (한국어)", "포인트 색상 (한국어)"],
  "items": {
    "top": "상의 설명 — 색상·소재·핏을 한국어로. 예: 화이트 면 소재 슬림핏 반팔 티셔츠",
    "bottom": "하의 설명 — 색상·소재·핏을 한국어로",
    "outer": "아우터 설명 (한국어, 필요 없으면 null)",
    "shoes": "신발 설명 (한국어)",
    "accessory": "액세서리 설명 (한국어, 없으면 null)"
  },
  "reason": "추천 이유 2~3문장 (한국어로. 예: '26도의 따뜻한 날씨이지만 이슬비가 내리고 있어 통기성이 좋은 린넨 셔츠와 방수 바람막이를 추천합니다.')"
}
"""


class BaseProvider(ABC):
    @property
    @abstractmethod
    def provider_name(self) -> str: ...

    @abstractmethod
    def generate(self, req: RecommendRequest, system_prompt: str, user_message: str) -> dict: ...


class _OpenAICompatProvider(BaseProvider):
    """OpenAI 호환 API를 사용하는 Provider 공통 로직"""

    def _call(self, client: OpenAI, model_chain: list[str], system_prompt: str, user_message: str) -> dict:
        for attempt, model in enumerate(model_chain):
            t0 = time.time()
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message},
                    ],
                    max_tokens=1024,
                )
                elapsed = round((time.time() - t0) * 1000)
                raw = response.choices[0].message.content or ""
                logger.info(
                    f"[AI] provider={self.provider_name} model={model} "
                    f"elapsed={elapsed}ms success=true length={len(raw)}"
                )
                return _parse_json(raw)

            except RateLimitError as e:
                elapsed = round((time.time() - t0) * 1000)
                wait = 2 ** attempt
                logger.warning(
                    f"[AI] provider={self.provider_name} model={model} "
                    f"elapsed={elapsed}ms success=false error=RateLimitError "
                    f"message={e} next_wait={wait}s"
                )
                if attempt < len(model_chain) - 1:
                    time.sleep(wait)
                    continue
                raise

            except AuthenticationError as e:
                elapsed = round((time.time() - t0) * 1000)
                logger.error(
                    f"[AI] provider={self.provider_name} model={model} "
                    f"elapsed={elapsed}ms success=false error=AuthenticationError message={e}"
                )
                raise

            except BadRequestError as e:
                elapsed = round((time.time() - t0) * 1000)
                logger.warning(
                    f"[AI] provider={self.provider_name} model={model} "
                    f"elapsed={elapsed}ms success=false error=BadRequestError message={e}"
                )
                if attempt < len(model_chain) - 1:
                    continue
                raise

            except Exception as e:
                elapsed = round((time.time() - t0) * 1000)
                logger.error(
                    f"[AI] provider={self.provider_name} model={model} "
                    f"elapsed={elapsed}ms success=false error={type(e).__name__} message={e}"
                )
                if attempt < len(model_chain) - 1:
                    continue
                raise

        raise RuntimeError(f"{self.provider_name} 전체 폴백 실패")


class GroqProvider(_OpenAICompatProvider):
    provider_name = "Groq"

    def generate(self, req: RecommendRequest, system_prompt: str, user_message: str) -> dict:
        api_key = os.environ.get("GROQ_API_KEY", "")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY가 설정되지 않았습니다.")
        client = OpenAI(api_key=api_key, base_url=GROQ_BASE_URL)
        return self._call(client, GROQ_MODEL_CHAIN, system_prompt, user_message)


class OpenRouterProvider(_OpenAICompatProvider):
    provider_name = "OpenRouter"

    def generate(self, req: RecommendRequest, system_prompt: str, user_message: str) -> dict:
        api_key = os.environ.get("OPENROUTER_API_KEY", "")
        if not api_key:
            raise RuntimeError("OPENROUTER_API_KEY가 설정되지 않았습니다.")
        client = OpenAI(api_key=api_key, base_url=OPENROUTER_BASE_URL)
        return self._call(client, OPENROUTER_MODEL_CHAIN, system_prompt, user_message)


class RuleBasedProvider(BaseProvider):
    provider_name = "RuleBased"

    def generate(self, req: RecommendRequest, system_prompt: str = "", user_message: str = "") -> dict:
        w = req.weather
        t0 = time.time()

        presets: dict = {
            "spring": {
                "style": "봄 캐주얼",
                "colors": ["화이트", "베이지", "라이트 탄"],
                "items": {
                    "top": "화이트 오버사이즈 린넨 셔츠",
                    "bottom": "베이지 와이드 슬랙스",
                    "outer": "라이트 트렌치코트" if w.temperature < 15 else None,
                    "shoes": "화이트 캔버스 스니커즈",
                    "accessory": "투명 우산" if w.is_raining else "라탄 버킷백",
                },
            },
            "summer": {
                "style": "서머 캐주얼",
                "colors": ["아이보리", "네이비", "화이트"],
                "items": {
                    "top": "스트라이프 반팔 린넨 셔츠",
                    "bottom": "아이보리 반바지",
                    "outer": "방수 바람막이" if w.is_raining else None,
                    "shoes": "슬립온 스니커즈",
                    "accessory": "경량 우산" if w.is_raining else "패브릭 크로스백",
                },
            },
            "autumn": {
                "style": "오텀 클래식",
                "colors": ["머스타드", "카멜", "다크 브라운"],
                "items": {
                    "top": "머스타드 니트 스웨터",
                    "bottom": "다크 브라운 슬랙스",
                    "outer": "카멜 울 블레이저" if w.temperature < 15 else None,
                    "shoes": "첼시 부츠",
                    "accessory": "우산" if w.is_raining else "레더 토트백",
                },
            },
            "winter": {
                "style": "모던 윈터",
                "colors": ["크림", "차콜", "네이비"],
                "items": {
                    "top": "크림 터틀넥 니트",
                    "bottom": "차콜 울 슬랙스",
                    "outer": "롱 패딩 점퍼" if w.is_snowing else "네이비 롱 코트",
                    "shoes": "블랙 앵클 부츠",
                    "accessory": "니트 장갑" if w.is_snowing else "울 머플러",
                },
            },
        }

        preset = presets.get(w.season, presets["spring"])
        elapsed = round((time.time() - t0) * 1000)
        logger.info(
            f"[AI] provider={self.provider_name} model=rule-engine "
            f"elapsed={elapsed}ms success=true"
        )
        return {
            **preset,
            "reason": (
                f"{w.temperature}°C의 {w.weather_description} 날씨에 맞춰 "
                f"날씨 데이터를 기반으로 추천드립니다."
            ),
        }


def _load_prompt(filename: str) -> str:
    return (PROMPT_DIR / filename).read_text(encoding="utf-8")


def _parse_json(raw: str) -> dict:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    if "<think>" in raw:
        end = raw.find("</think>")
        if end != -1:
            raw = raw[end + len("</think>"):].strip()

    return json.loads(raw)


def _build_message(req: RecommendRequest) -> str:
    p = req.profile
    w = req.weather

    precipitation_info = "없음"
    if w.is_raining:
        precipitation_info = "비 내림"
    elif w.is_snowing:
        precipitation_info = "눈 내림"

    template = _load_prompt("ootd_prompt_v2.txt")
    return template.format(
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
    ) + JSON_SCHEMA


def generate_recommendation(req: RecommendRequest) -> dict:
    groq = GroqProvider()
    openrouter = OpenRouterProvider()
    rule_based = RuleBasedProvider()

    system_prompt = _load_prompt("system_prompt.txt")
    user_message = _build_message(req)

    # 1순위: Groq (무료, 빠름)
    if os.environ.get("GROQ_API_KEY"):
        try:
            result = groq.generate(req, system_prompt, user_message)
            logger.info("[recommend] Groq 성공")
            return result
        except Exception as e:
            logger.warning(f"[recommend] Groq 실패 — OpenRouter 폴백 error={type(e).__name__}: {e}")
    else:
        logger.warning("[recommend] GROQ_API_KEY 미설정 — OpenRouter로 시도")

    # 2순위: OpenRouter (무료 모델 잔여분)
    if os.environ.get("OPENROUTER_API_KEY"):
        try:
            result = openrouter.generate(req, system_prompt, user_message)
            logger.info("[recommend] OpenRouter 성공")
            return result
        except Exception as e:
            logger.warning(f"[recommend] OpenRouter 실패 — RuleBased 폴백 error={type(e).__name__}: {e}")

    # 3순위: Rule-Based (항상 성공)
    result = rule_based.generate(req)
    logger.info("[recommend] RuleBased 폴백 완료")
    return result
