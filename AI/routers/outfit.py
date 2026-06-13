import logging
from fastapi import APIRouter, HTTPException
from google.api_core.exceptions import PermissionDenied, Unauthenticated, InvalidArgument, ResourceExhausted
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
    except (PermissionDenied, Unauthenticated):
        raise HTTPException(status_code=401, detail="GOOGLE_API_KEY 인증 실패 — Render 환경변수를 확인하세요")
    except InvalidArgument as e:
        raise HTTPException(status_code=400, detail=f"API 키 형식 오류: {str(e)}")
    except ResourceExhausted:
        raise HTTPException(status_code=429, detail="Too Many Requests")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[recommend] 처리 실패 {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI 추천 생성 실패: {type(e).__name__}: {str(e)}")
