from fastapi import APIRouter, HTTPException
from schemas.request import RecommendRequest
from schemas.response import RecommendResponse
from services.recommend import generate_recommendation

router = APIRouter()


@router.post("/recommend", response_model=RecommendResponse)
async def recommend(req: RecommendRequest):
    try:
        result = generate_recommendation(req)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 추천 생성 실패: {str(e)}")
