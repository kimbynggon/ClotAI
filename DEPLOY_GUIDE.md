# ClotAI 배포 가이드

> 작성일: 2026-06-09
> GitHub: https://github.com/kimbynggon/ClotAI
> 배포 스택: Vercel (FE) + Render (BE/AI) + Neon (PostgreSQL)

---

## 배포 전 체크리스트

- [x] GitHub Push 완료
- [x] Vercel 가입 완료
- [x] Render 가입 완료
- [x] Neon 가입 완료
- [x] .env Git 업로드 안됨 (`.gitignore` 차단 확인)
- [x] README 존재
- [ ] Swagger 정상동작 확인 (배포 후)

---

## 알려진 주의사항

### Render 임시 파일시스템

Render 무료 플랜은 Ephemeral Filesystem을 사용합니다.
서비스 재시작(슬립 후 재기동) 시 `uploads/` 디렉토리 전체가 삭제됩니다.
프로필 이미지 업로드 기능은 로컬/개발 환경에서만 정상 동작합니다.
추후 Cloudinary 또는 S3 연동으로 해결 필요합니다.

### JWT_SECRET 기본값

`JWT_SECRET` 환경변수를 설정하지 않으면 `clotai_secret`이 운영에 사용됩니다.
반드시 Render 환경변수에서 32자 이상 랜덤 문자열로 설정해야 합니다.

### FastAPI 동기 호출

`AI/services/recommend.py`에서 동기 Anthropic SDK 호출 사용 중입니다.
Render 단일 워커 환경에서 AI 응답 대기 시간(약 5초) 동안 다른 요청 처리가 불가합니다.
소규모 트래픽에서는 무시 가능하며 추후 `asyncio.run_in_executor`로 개선 예정입니다.

---

## 환경변수 목록

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

## Render 설정

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

## Vercel 설정

| 항목 | 값 |
|------|-----|
| Framework Preset | Next.js |
| Root Directory | `FE` |
| Build Command | `next build` (자동 감지) |
| Output Directory | `.next` (자동 감지) |
| Node.js Version | 20.x |

---

## Neon 연결

Neon 대시보드에서 제공하는 Connection string 형식:

```
postgresql://[user]:[password]@[host].neon.tech/[dbname]?sslmode=require
```

Prisma 연결 시 `?sslmode=require` 필수입니다. 없으면 연결 오류가 발생합니다.

---

## 실제 배포 순서

### STEP 1 — GitHub Push

```bash
git push origin main
```

완료 확인: `https://github.com/kimbynggon/ClotAI` 에서 README 표시 여부

---

### STEP 2 — JWT_SECRET 생성

아래 명령어 실행 후 출력된 64자리 문자열을 메모합니다.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### STEP 3 — Neon DB 생성

1. [neon.tech](https://neon.tech) → 로그인
2. 우상단 **"New Project"** 클릭
3. 입력:
   - Project name: `clotai`
   - Database name: `neondb`
   - Region: `Asia Pacific (Singapore)`
4. **"Create Project"** 클릭
5. Connection Details에서 아래 형식의 URL 복사:
   ```
   postgresql://유저:비밀번호@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

---

### STEP 4 — Render AI 서비스 배포

1. [render.com](https://render.com) → 로그인
2. **"New +"** → **"Web Service"** 클릭
3. **"Connect a repository"** → `kimbynggon/ClotAI` 선택 → **"Connect"**
4. 설정 입력:

   | 항목 | 값 |
   |------|-----|
   | Name | `clotai-ai` |
   | Root Directory | `AI` |
   | Runtime | `Python 3` |
   | Build Command | `pip install -r requirements.txt` |
   | Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
   | Instance Type | `Free` |

5. **"Environment Variables"** 섹션에서 **"Add Environment Variable"** 클릭 후 추가:

   | Key | Value |
   |-----|-------|
   | `ANTHROPIC_API_KEY` | 실제 Anthropic API 키 |
   | `AI_MODEL` | `claude-haiku-4-5-20251001` |
   | `CORS_ORIGIN` | `http://placeholder` (STEP 6에서 수정) |

6. **"Create Web Service"** 클릭
7. 배포 로그에서 **"Live"** 표시 확인 후 URL 복사
   - 예: `https://clotai-ai.onrender.com`

---

### STEP 5 — Render BE 서비스 배포

1. **"New +"** → **"Web Service"** 클릭
2. 동일 저장소 `kimbynggon/ClotAI` 선택
3. 설정 입력:

   | 항목 | 값 |
   |------|-----|
   | Name | `clotai-be` |
   | Root Directory | `BE` |
   | Runtime | `Node` |
   | Build Command | `npm install && npx prisma generate && npm run build` |
   | Start Command | `npx prisma migrate deploy && node dist/main` |
   | Instance Type | `Free` |

4. **"Environment Variables"** 추가:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | STEP 3의 Neon URL (`?sslmode=require` 포함) |
   | `JWT_SECRET` | STEP 2에서 생성한 64자리 문자열 |
   | `JWT_EXPIRES_IN` | `7d` |
   | `AI_SERVICE_URL` | STEP 4의 AI URL (예: `https://clotai-ai.onrender.com`) |
   | `CORS_ORIGIN` | `http://placeholder` (STEP 6에서 수정) |

5. **"Create Web Service"** 클릭
6. 배포 로그에서 `Server: http://...` 확인 후 URL 복사
   - 예: `https://clotai-be.onrender.com`

---

### STEP 6 — Vercel FE 배포

1. [vercel.com](https://vercel.com) → 로그인
2. **"Add New..."** → **"Project"** 클릭
3. `kimbynggon/ClotAI` Import
4. 설정:
   - Framework Preset: `Next.js` (자동 감지)
   - Root Directory: **"Edit"** 클릭 → `FE` 입력
5. **"Environment Variables"** 추가:

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_API_URL` | STEP 5의 BE URL (예: `https://clotai-be.onrender.com`) |
   | `NEXT_PUBLIC_USE_MOCK` | `false` |
   | `NEXT_PUBLIC_ENABLE_EMAIL_VERIFICATION` | `false` |

6. **"Deploy"** 클릭
7. 완료 후 FE URL 복사: 예 `https://clotai.vercel.app`

---

### STEP 7 — 환경변수 최종 연결

배포가 모두 끝나면 실제 URL로 환경변수를 업데이트합니다.

**Render → clotai-ai:**
- Dashboard → `clotai-ai` → **"Environment"** 탭
- `CORS_ORIGIN` 값을 `https://clotai-be.onrender.com` 으로 수정
- **"Save Changes"** → 자동 재배포 대기

**Render → clotai-be:**
- Dashboard → `clotai-be` → **"Environment"** 탭
- `CORS_ORIGIN` 값을 `https://clotai.vercel.app` 으로 수정
- **"Save Changes"** → 자동 재배포 대기

---

### STEP 8 — 배포 확인

재배포 완료 후 순서대로 확인:

```
[ ] https://clotai.vercel.app              → 홈 화면 표시
[ ] 회원가입 → 성공
[ ] 로그인 → JWT 토큰 수신
[ ] 프로필 등록 → 저장 확인
[ ] OOTD 추천 → AI 응답 (콜드스타트 포함 최대 75초)
[ ] 추천 이력 조회 → 목록 표시
[ ] https://clotai-be.onrender.com/api/docs → Swagger 접속 확인
```

---

## 운영 전략 (무료 유지)

Render BE + AI는 비활성 15분 후 슬립 상태가 됩니다.
첫 요청 시 콜드스타트 30~50초가 발생하며 이후 정상 속도로 동작합니다.

UptimeRobot 설정 (무료, 다운 감지 알림):
1. [uptimerobot.com](https://uptimerobot.com) → 무료 회원가입
2. **"Add New Monitor"** × 2:

   | 항목 | BE 모니터 | AI 모니터 |
   |------|-----------|-----------|
   | Type | HTTP(s) | HTTP(s) |
   | Name | ClotAI BE | ClotAI AI |
   | URL | `https://clotai-be.onrender.com` | `https://clotai-ai.onrender.com/health` |
   | Interval | 5 minutes | 5 minutes |

---

## Prisma 운영 배포 주의사항

```
로컬 개발:   npx prisma migrate dev    (마이그레이션 파일 생성 + 적용)
운영 배포:   npx prisma migrate deploy  (파일 적용만, 생성 안 함)
```

Start Command에 `npx prisma migrate deploy`가 포함되어 있으므로 자동으로 처리됩니다.
