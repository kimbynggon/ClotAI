# ClotAI 배포 가이드

> 작성일: 2026-06-07  
> 알림 이메일: tmxhszi@naver.com  
> 배포 스택: Vercel (FE) + Render (BE/AI) + Neon (PostgreSQL)

---

## 1. 배포 전 체크리스트

### 필수 (배포 전 반드시 완료)

- [ ] Neon PostgreSQL 생성 및 `DATABASE_URL` 확보
- [ ] `JWT_SECRET` 강력한 랜덤 값으로 설정 (최소 32자)
- [ ] `ANTHROPIC_API_KEY` 유효한 키 확인
- [ ] `uploads/` 디렉토리를 `.gitignore`에 추가 (사용자 이미지 Git 제외)
- [ ] 실제 `.env` 파일이 Git에 포함되지 않았는지 확인
- [ ] Prisma 마이그레이션 파일 존재 확인 (`BE/prisma/migrations/`)

### 주의사항 (알고 배포)

- [ ] **Render 이미지 업로드 제한** → 아래 별도 설명 참고
- [ ] GitHub 저장소가 public이면 `.env.example` 내 실제 비밀번호 제거

---

## 2. 발견된 문제점

### 🔴 심각 — Render 임시 파일시스템

```
BE/src/profile/profile.controller.ts
  destination: './uploads/profile'   ← 로컬 디스크 저장

Render 무료 플랜 = Ephemeral Filesystem
→ 서비스 재시작 시 uploads/ 디렉토리 전체 삭제
→ 업로드된 프로필 이미지 소실
```

**배포 후 동작:** 이미지 업로드는 가능하지만 Render 재시작(슬립 후 재기동) 시 파일 삭제됨.  
**대응 방안:** 이미지 업로드 기능은 로컬/개발 환경에서만 정상 동작함을 인지하고 배포. 추후 Cloudinary 또는 S3 연동으로 해결.

### 🟡 주의 — JWT_SECRET 기본값

```ts
// BE/src/auth/auth.module.ts
secret: process.env.JWT_SECRET ?? 'clotai_secret'
```

`JWT_SECRET` 환경변수를 설정하지 않으면 `clotai_secret`이 운영에 사용됩니다.  
**반드시 Render 환경변수에서 덮어써야 합니다.**

### 🟡 주의 — .env.example 실 비밀번호 노출

```
# BE/.env.example
DATABASE_URL=postgresql://postgres:852456@localhost:5432/postgres
```

실제처럼 보이는 비밀번호가 포함돼 있습니다. GitHub public repo라면 플레이스홀더로 변경 필요.

### 🟡 주의 — FastAPI 동기 호출

```python
# AI/services/recommend.py
response = client.messages.create(...)  # 동기 호출
```

FastAPI async 핸들러 안에서 동기 Anthropic SDK 호출 사용 중.  
Render 단일 워커 환경에서 AI 응답 대기 시간(~5초) 동안 다른 요청 처리 불가.  
소규모 트래픽에서는 무시 가능, 추후 `asyncio.run_in_executor`로 개선.

---

## 3. 환경변수 목록

### FE 환경변수 (Vercel)

| 변수명 | 로컬 값 | 운영 값 | 필수 |
|--------|---------|---------|------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | `https://clotai-be.onrender.com` | ✅ |
| `NEXT_PUBLIC_USE_MOCK` | `false` | `false` | ✅ |
| `NEXT_PUBLIC_ENABLE_EMAIL_VERIFICATION` | `false` | `false` | - |

### BE 환경변수 (Render)

| 변수명 | 로컬 값 | 운영 값 | 필수 |
|--------|---------|---------|------|
| `NODE_ENV` | `development` | `production` | ✅ |
| `PORT` | `3000` | Render 자동 설정 | ✅ |
| `DATABASE_URL` | 로컬 PG | Neon URL + `?sslmode=require` | ✅ |
| `JWT_SECRET` | (기본값 위험) | 32자 이상 랜덤 문자열 | ✅ |
| `JWT_EXPIRES_IN` | `7d` | `7d` | ✅ |
| `CORS_ORIGIN` | `http://localhost:3001` | `https://clotai.vercel.app` | ✅ |
| `AI_SERVICE_URL` | `http://localhost:8000` | `https://clotai-ai.onrender.com` | ✅ |

### AI 환경변수 (Render)

| 변수명 | 로컬 값 | 운영 값 | 필수 |
|--------|---------|---------|------|
| `ANTHROPIC_API_KEY` | 실제 키 | 실제 키 | ✅ |
| `AI_MODEL` | `claude-haiku-4-5-20251001` | `claude-haiku-4-5-20251001` | ✅ |
| `PORT` | `8000` | Render 자동 설정 | ✅ |
| `CORS_ORIGIN` | `http://localhost:3000` | `https://clotai-be.onrender.com` | - |

---

## 4. 보안 검토

| 항목 | 상태 | 비고 |
|------|------|------|
| 비밀번호 bcrypt 해시 | ✅ | SALT_ROUNDS=10 |
| JWT Guard 인증 보호 | ✅ | 모든 민감 라우트 적용 |
| 입력값 유효성 검증 | ✅ | class-validator + whitelist |
| CORS 환경변수 분리 | ✅ | origin 고정 가능 |
| 전역 예외 필터 | ✅ | 스택 트레이스 노출 없음 |
| JWT_SECRET 기본값 | ⚠️ | 운영 시 반드시 변경 |
| 파일 업로드 타입 검증 | ✅ | jpeg/png/webp + 5MB 제한 |
| SQL Injection 방어 | ✅ | Prisma ORM 사용 |

---

## 5. Prisma 운영 배포 주의사항

```
로컬 개발:   prisma migrate dev    (마이그레이션 파일 생성 + 적용)
운영 배포:   prisma migrate deploy  (파일 적용만, 생성 안 함)

Neon SSL 필수:
DATABASE_URL = "postgresql://user:pass@host.neon.tech/db?sslmode=require"
                                                            ↑ 반드시 추가
```

---

## 6. Render 배포 설정

### BE (NestJS)

| 항목 | 값 |
|------|-----|
| Runtime | Node |
| Root Directory | `BE` |
| Build Command | `npm install && npx prisma generate && npm run build` |
| Start Command | `npx prisma migrate deploy && node dist/main` |
| Instance Type | Free |

### AI (FastAPI)

| 항목 | 값 |
|------|-----|
| Runtime | Python 3 |
| Root Directory | `AI` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Instance Type | Free |

---

## 7. Vercel 배포 설정

| 항목 | 값 |
|------|-----|
| Framework Preset | Next.js |
| Root Directory | `FE` |
| Build Command | `next build` (자동 감지) |
| Output Directory | `.next` (자동 감지) |
| Node.js Version | 20.x |

---

## 8. Neon 연결 설정

Neon 대시보드에서 제공하는 Connection string 형식:

```
postgresql://[user]:[password]@[host].neon.tech/[dbname]?sslmode=require
```

> Prisma와 연결 시 `?sslmode=require` 필수. 없으면 연결 오류 발생.

---

## 9. 운영 전략 (무료 유지)

```
슬립 허용 전략 (비용 0원)
─────────────────────────────────────────────────
Render BE + AI: 비활성 15분 후 슬립
→ 첫 요청 시 콜드스타트 30~50초 발생
→ 이후 정상 속도 유지

UptimeRobot 설정 (무료, 슬립 감지 알림)
→ tmxhszi@naver.com 으로 알림 수신
→ 서비스 다운 감지 시 이메일 발송
→ 슬립 방지 핑은 사용하지 않음 (750시간 절약)
```

---

## 10. 실제 배포 순서

### STEP 1 — GitHub 준비

```bash
# 새 저장소 생성 후 remote 연결
git remote add origin https://github.com/[계정]/ClotAI.git
git push -u origin main
```

확인 사항:
- `.gitignore`에 `.env`, `uploads/` 포함 여부
- 실제 `.env` 파일이 Git에 올라가지 않았는지 확인

---

### STEP 2 — Neon DB 생성

1. [neon.tech](https://neon.tech) 접속 → 회원가입 (GitHub 로그인 가능)
2. **New Project** → 프로젝트명: `clotai`
3. Database: `neondb`, Region: `Asia Pacific (Singapore)`
4. **Connection Details**에서 Connection string 복사
   ```
   postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
5. 이 URL을 BE 환경변수 `DATABASE_URL`로 사용

---

### STEP 3 — Render AI 서비스 배포

1. [render.com](https://render.com) 접속 → 회원가입 (GitHub 로그인)
2. **New → Web Service** → GitHub 저장소 연결
3. 설정 입력:
   ```
   Name:           clotai-ai
   Root Directory: AI
   Runtime:        Python 3
   Build Command:  pip install -r requirements.txt
   Start Command:  uvicorn main:app --host 0.0.0.0 --port $PORT
   Instance Type:  Free
   ```
4. **Environment Variables** 추가:
   ```
   ANTHROPIC_API_KEY = [실제 키]
   AI_MODEL          = claude-haiku-4-5-20251001
   CORS_ORIGIN       = (BE URL은 다음 단계 후 추가)
   ```
5. **Deploy** → 완료 후 URL 복사 (예: `https://clotai-ai.onrender.com`)

---

### STEP 4 — Render BE 서비스 배포

1. **New → Web Service** → 동일 저장소 연결
2. 설정 입력:
   ```
   Name:           clotai-be
   Root Directory: BE
   Runtime:        Node
   Build Command:  npm install && npx prisma generate && npm run build
   Start Command:  npx prisma migrate deploy && node dist/main
   Instance Type:  Free
   ```
3. **Environment Variables** 추가:
   ```
   NODE_ENV        = production
   DATABASE_URL    = [Neon Connection String + ?sslmode=require]
   JWT_SECRET      = [32자 이상 랜덤 문자열]
   JWT_EXPIRES_IN  = 7d
   AI_SERVICE_URL  = https://clotai-ai.onrender.com
   CORS_ORIGIN     = (Vercel URL은 다음 단계 후 추가)
   ```
4. **Deploy** → 완료 후 URL 복사 (예: `https://clotai-be.onrender.com`)
5. AI 서비스로 돌아가서 `CORS_ORIGIN = https://clotai-be.onrender.com` 추가

---

### STEP 5 — Vercel FE 배포

1. [vercel.com](https://vercel.com) 접속 → GitHub 로그인
2. **New Project** → ClotAI 저장소 선택
3. 설정:
   ```
   Framework Preset:  Next.js
   Root Directory:    FE
   ```
4. **Environment Variables** 추가:
   ```
   NEXT_PUBLIC_API_URL                   = https://clotai-be.onrender.com
   NEXT_PUBLIC_USE_MOCK                  = false
   NEXT_PUBLIC_ENABLE_EMAIL_VERIFICATION = false
   ```
5. **Deploy** → 완료 후 URL 복사 (예: `https://clotai.vercel.app`)

---

### STEP 6 — 환경변수 최종 연결

```
Render BE → CORS_ORIGIN 업데이트:
  CORS_ORIGIN = https://clotai.vercel.app

→ Render BE Redeploy 실행
```

---

### STEP 7 — UptimeRobot 알림 설정

1. [uptimerobot.com](https://uptimerobot.com) 접속 → 무료 회원가입
   - 이메일: `tmxhszi@naver.com`

2. **Add New Monitor** × 2:

   | 항목 | BE 모니터 | AI 모니터 |
   |------|-----------|-----------|
   | Type | HTTP(s) | HTTP(s) |
   | Name | ClotAI BE | ClotAI AI |
   | URL | `https://clotai-be.onrender.com` | `https://clotai-ai.onrender.com/health` |
   | Interval | 5 minutes | 5 minutes |
   | Alert | tmxhszi@naver.com | tmxhszi@naver.com |

---

### STEP 8 — 배포 확인

```
[ ] https://clotai.vercel.app 접속 → 홈화면 표시
[ ] 회원가입 → 성공
[ ] 로그인 → JWT 토큰 수신
[ ] 프로필 등록 → 저장 확인
[ ] OOTD 추천 → AI 응답 (최대 75초, 콜드스타트 포함)
[ ] 추천 이력 조회 → 목록 표시
[ ] Swagger → https://clotai-be.onrender.com/api/docs 접속 확인
```

---

## 부록 — JWT_SECRET 생성

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

위 명령어를 실행해 나온 64자리 16진수 문자열을 `JWT_SECRET`으로 사용.
