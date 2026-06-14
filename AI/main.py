import logging
import os
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import outfit

load_dotenv()


class _FlushHandler(logging.StreamHandler):
    """emit 직후 즉시 flush - Render 컨테이너 버퍼링 방지"""

    def emit(self, record: logging.LogRecord) -> None:
        super().emit(record)
        self.flush()


_handler = _FlushHandler(sys.stdout)
_handler.setFormatter(
    logging.Formatter("%(asctime)s [%(levelname)s] %(name)s - %(message)s")
)
logging.root.setLevel(logging.INFO)
logging.root.handlers = [_handler]

logger = logging.getLogger(__name__)

app = FastAPI(title="ClotAI - AI Service", version="1.0.0")

raw_origin = os.getenv("CORS_ORIGIN", "http://localhost:3000")
allowed_origins = [o.strip() for o in raw_origin.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(outfit.router, tags=["outfit"])


@app.on_event("startup")
async def startup_check():
    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        logger.warning("[startup] OPENROUTER_API_KEY 환경변수가 설정되지 않았습니다. /recommend 요청이 실패합니다.")
    else:
        masked = api_key[:12] + "..." if len(api_key) > 12 else "***"
        logger.info(f"[startup] OPENROUTER_API_KEY 확인 prefix={masked} length={len(api_key)}")


@app.get("/health")
async def health():
    api_key_set = bool(os.environ.get("OPENROUTER_API_KEY", ""))
    return {"status": "ok", "service": "clotai-ai", "api_key_configured": api_key_set}
