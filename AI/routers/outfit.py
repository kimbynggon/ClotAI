import logging
from fastapi import APIRouter, HTTPException
from schemas.request import RecommendRequest
from schemas.response import RecommendResponse
from services.recommend import generate_recommendation

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/recommend", response_model=RecommendResponse)
async def recommend(req: RecommendRequest):
    try:
        logger.info("[recommend] 요청 수신 — Gemini 호출 시작")
        result = generate_recommendation(req)
        logger.info("[recommend] Gemini 응답 완료")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[recommend] 처리 실패 {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI 추천 생성 실패: {type(e).__name__}: {str(e)}")
