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
        logger.info("[recommend] 요청 수신 — OpenRouter 호출 시작")
        result = generate_recommendation(req)
        logger.info("[recommend] OpenRouter 응답 완료")
        return result
    except AuthenticationError as e:
        raise HTTPException(status_code=401, detail=f"OpenRouter API 인증 실패: {str(e)}")
    except RateLimitError as e:
        raise HTTPException(status_code=429, detail="OpenRouter 요청 한도 초과, 잠시 후 다시 시도해주세요.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[recommend] 처리 실패 {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI 추천 생성 실패: {type(e).__name__}: {str(e)}")
