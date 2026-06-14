import logging
from fastapi import APIRouter, HTTPException
from openai import AuthenticationError, RateLimitError
from schemas.request import RecommendRequest
from schemas.response import RecommendResponse
from services.recommend import generate_recommendation

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/recommend", response_model=RecommendResponse)
async def recommend(req: RecommendRequest):
    try:
        logger.info(
            f"[router] 추천 요청 수신 "
            f"gender={req.profile.gender} temp={req.weather.temperature} "
            f"season={req.weather.season}"
        )
        result = generate_recommendation(req)
        logger.info(f"[router] 추천 완료 style={result.get('style', '')}")
        return result
    except AuthenticationError as e:
        logger.error(f"[router] 인증 실패: {e}")
        raise HTTPException(status_code=401, detail=f"OpenRouter API 인증 실패: {str(e)}")
    except RateLimitError as e:
        logger.warning(f"[router] Rate limit 초과: {e}")
        raise HTTPException(status_code=429, detail="OpenRouter 요청 한도 초과, 잠시 후 다시 시도해주세요.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[router] 처리 실패 {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI 추천 생성 실패: {type(e).__name__}: {str(e)}")
