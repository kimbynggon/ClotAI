# ClotAI — AI 기반 패션 추천 서비스

> 날씨와 체형을 분석해 오늘의 코디(OOTD)를 추천해주는 AI 패션 어드바이저

---

## 왜 만들었나요?

매일 아침 "오늘 뭐 입지?"라는 고민을 해결하고 싶었습니다. 단순히 날씨만 보는 게 아니라, 사용자의 체형·스타일 취향·예산까지 반영한 **진짜 내 스타일에 맞는 추천**을 주는 서비스가 없다는 점에서 ClotAI를 기획했습니다.

AI 모델이 다운되거나 Rate Limit에 걸려도 서비스가 끊기지 않도록 **다중 Provider 폴백 구조**를 구현한 것이 기술적 핵심입니다.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 회원가입 / 로그인 | 이메일+비밀번호, Google/Kakao OAuth 지원 |
| 프로필 등록 | 성별, 체형, 선호 스타일, 선호 색상, 예산 설정 |
| 실시간 날씨 조회 | 도시명 또는 GPS 좌표로 현재 날씨 수집 |
| AI OOTD 추천 | 날씨 + 체형 + 취향을 종합 분석한 맞춤 코디 |
| 무신사 연동 | 추천 아이템 클릭 시 무신사 검색으로 바로 이동 |
| 즐겨찾기 | 마음에 드는 추천 코디 저장 |
| 추천 이력 조회 | 과거 추천 코디 이력 열람 |
| 게스트 모드 | 회원가입 없이 하루 5회 체험 가능 |

---

## AI 추천 시스템 — 다중 Provider 폴백 구조

단일 모델 의존에서 벗어나 **Provider 체인**으로 장애에 대응합니다.

```
AI Service
  ├─ OpenRouter Provider
  │    ├─ 1순위: Qwen3 14B (메인, 한국어 강점)
  │    ├─ 2순위: Gemma 3 27B (백업, 고품질 instruction)
  │    ├─ 3순위: Llama 3.3 70B (3순위 free)
  │    └─ 4순위: Llama 3.1 8B (유료 최후 보루)
  └─ Rule-Based Provider (AI 전체 장애 시 날씨 기반 기본 추천)
```

각 AI 호출마다 **Provider · Model · 응답시간 · 성공여부 · 에러메시지**를 로그로 기록합니다.

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 14 (App Router), React, Tailwind CSS |
| Backend | NestJS, TypeScript, Prisma ORM |
| Database | PostgreSQL (Neon) |
| AI | FastAPI, Python, OpenRouter API |
| 인증 | JWT, Google OAuth, Kakao OAuth |
| 날씨 | Open-Meteo (무료, API 키 불필요) |
| 배포 | Vercel (FE) / Render (BE·AI) |
| 테스트 | Bruno |

---

## 프로젝트 구조

```
ClotAI/
├── FE/          # Next.js 프론트엔드
├── BE/          # NestJS 백엔드 + Prisma
├── AI/          # FastAPI AI 서비스
│   ├── services/recommend.py   # Provider 폴백 체인
│   ├── prompts/                # 프롬프트 파일 버전 관리
│   └── schemas/                # 요청·응답 스키마
└── docs/bruno/  # Bruno API 테스트 컬렉션
```

---

## API 구조

REST API, 모든 응답은 아래 형식을 따릅니다.

```json
{
  "success": true,
  "message": "",
  "data": {}
}
```

주요 엔드포인트:

```
POST   /api/auth/signup            회원가입
POST   /api/auth/login             로그인
GET    /api/auth/google            Google OAuth
GET    /api/auth/kakao             Kakao OAuth

PUT    /api/profile                프로필 등록/수정

GET    /api/weather                날씨 조회

POST   /api/outfit/recommend       OOTD 추천 (로그인 필요)
POST   /api/outfit/guest/recommend 게스트 추천
GET    /api/outfit/history         추천 이력

POST   /api/favorite/toggle        즐겨찾기 토글
GET    /api/favorite               즐겨찾기 목록
```

Swagger 문서: `https://clotai-be.onrender.com/api/docs`

---

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

---

## 배포

배포 절차는 [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md)를 참고하세요.

---

## 추천 결과 예시

```json
{
  "style": "Summer Casual",
  "colors": ["아이보리", "네이비", "화이트"],
  "items": {
    "top": "아이보리 린넨 반팔 셔츠",
    "bottom": "네이비 치노 반바지",
    "outer": null,
    "shoes": "흰색 슬립온 스니커즈",
    "accessory": "패브릭 크로스백"
  },
  "reason": "26도의 따뜻한 날씨이지만 이슬비가 내리고 있어 통기성이 좋은 린넨 셔츠와 방수 처리된 크로스백을 추천합니다. 아이보리와 네이비 조합은 여름철 깔끔한 캐주얼 스타일에 잘 어울립니다."
}
```
