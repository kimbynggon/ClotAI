from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from routers import outfit

load_dotenv()

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


@app.get("/health")
async def health():
    return {"status": "ok", "service": "clotai-ai"}
