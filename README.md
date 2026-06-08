# ClotAI

AI 기반 패션 추천 웹 서비스. 날씨와 사용자 체형/스타일 정보를 바탕으로 OOTD를 추천합니다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS |
| Backend | NestJS, Prisma, PostgreSQL |
| AI | FastAPI, Anthropic Claude |
| 배포 | Vercel (FE) / Render (BE·AI) / Neon (DB) |

## 프로젝트 구조

```
ClotAI/
├── FE/          # Next.js 프론트엔드
├── BE/          # NestJS 백엔드 + Prisma
├── AI/          # FastAPI AI 서비스
└── docs/bruno/  # Bruno API 테스트 컬렉션
```

## MVP 기능

1. 회원가입 / 로그인 (JWT)
2. 사용자 프로필 및 체형 정보 등록
3. 실시간 날씨 조회 (Open-Meteo)
4. AI OOTD 추천 (Claude)
5. 추천 결과 저장 및 이력 조회

## 로컬 실행

### 사전 준비

- Node.js 20+, Python 3.11+, PostgreSQL

### 환경 변수 설정

```bash
cp BE/.env.example BE/.env
cp AI/.env.example AI/.env
cp FE/.env.example FE/.env.local
```

### BE (NestJS)

```bash
cd BE
npm install
npx prisma migrate dev
npm run start:dev
# http://localhost:3000/api
# http://localhost:3000/api/docs  ← Swagger
```

### AI (FastAPI)

```bash
cd AI
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# http://localhost:8000
```

### FE (Next.js)

```bash
cd FE
npm install
npm run dev
# http://localhost:3001
```

## 배포

배포 절차는 [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md)를 참고하세요.

## API 문서

운영 Swagger: `https://clotai-be.onrender.com/api/docs`
