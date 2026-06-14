# ClotAI — AI 서비스

FastAPI 기반 OOTD 추천 AI 서버

---

## AI 모델 전환 기록: Gemini → OpenRouter (Llama 3.3)

### 전환 일자
2026-06-14

---

### 배경 — Google Gemini 무료 티어 정책 변경

ClotAI는 초기 개발 단계에서 Google Gemini API 무료 티어를 사용하여 OOTD 추천 기능을 구현했습니다.
그러나 2025년 하반기부터 Google이 Gemini API 무료 할당량을 대폭 축소하면서 서비스 운영에 직접적인 장애가 발생했습니다.

---

### 문제점 상세

#### 1. 무료 할당량 사실상 폐지 수준으로 축소

| 모델 | 변경 전 | 변경 후 |
|---|---|---|
| Gemini 2.5 Pro | 일 50회 | **0회 (완전 차단)** |
| Gemini 2.5 Flash | 일 250회 | **일 20회** |
| Gemini 2.0 Flash | 일 1,500회 | **일 200회 이하** |

Gemini 2.5 Flash 기준 현재 무료 티어 한도:

- **RPM (분당 요청 수): 5회**
- **RPD (일일 요청 수): 20회**
- **TPM (분당 토큰 수): 250,000**

RPD 20회는 단일 사용자가 하루에 OOTD 추천을 20회 이상 받을 수 없다는 의미입니다.
멀티유저 환경에서는 수 분 내에 한도에 도달합니다.

#### 2. 실제 발생한 에러

```
429 RESOURCE_EXHAUSTED
Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests
limit: 0, model: gemini-2.0-flash
```

`limit: 0` 으로 표시된 것은 해당 프로젝트에 적용된 무료 할당량이 완전히 소진 또는 차단된 상태임을 의미합니다.

#### 3. 잘못된 API 키 형식 사용 (`AQ.` 토큰 문제)

초기 구현에서 `GOOGLE_API_KEY`에 `AQ.` 접두사를 가진 **OAuth 액세스 토큰**을 사용했습니다.
이 토큰은 `gcloud auth print-access-token` 명령으로 발급되는 **단기 인증 토큰(TTL: 약 1시간)** 으로,
Gemini API 장기 사용 목적의 API Key(`AIza...` 형식)가 아닙니다.

- OAuth 토큰은 만료 후 자동으로 인증 실패(401/403)가 발생함
- 무료 할당량 할당 대상이 아니어서 `limit: 0` 에러가 지속적으로 발생함
- Render 등 배포 환경에서 토큰 갱신이 불가능하여 사실상 서비스 중단 상태를 유발함

#### 4. 기존 코드의 폴백 로직 오작동

기존 폴백 코드에서 HTTP 상태 코드를 다음과 같이 추출했습니다.

```python
status = getattr(e, "status_code", 0)  # google-genai SDK에 status_code 속성 없음
```

`google-genai` SDK의 `ClientError`는 `status_code` 속성을 노출하지 않아 항상 `0`이 반환됐습니다.
결과적으로 429 감지 → 폴백 분기가 전혀 동작하지 않았고, 모든 에러가 500으로 처리됐습니다.

---

### OpenRouter를 선택한 이유

#### 1. 넉넉한 무료 티어

OpenRouter는 `llama-3.3-70b-instruct:free` 등 무료 모델에 대해 **일일 요청 횟수 제한 없이** 사용할 수 있습니다.
RPM(분당 요청) 제한은 있으나 소규모 MVP 서비스 수준에서는 충분합니다.

| 항목 | Gemini 2.5 Flash 무료 | OpenRouter 무료 |
|---|---|---|
| 일일 요청(RPD) | **20회** | **제한 없음** |
| 분당 요청(RPM) | 5회 | 모델별 상이 (충분) |
| 정책 안정성 | 갑작스러운 축소 전례 있음 | 안정적 유지 중 |

#### 2. OpenAI 호환 API

OpenRouter는 OpenAI API 형식을 그대로 사용합니다.
`openai` Python 패키지에 `base_url`만 교체하면 전환이 완료되어 코드 변경 범위가 최소화됩니다.

```python
client = OpenAI(
    api_key=OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1",
)
```

#### 3. Llama 3.3 70B 모델 성능

Meta의 Llama 3.3 70B는 GPT-4급 성능을 가진 오픈소스 대형 언어 모델입니다.
패션 코디 추천처럼 창의적인 텍스트 생성이 필요한 작업에 충분한 품질을 제공합니다.

#### 4. 벤더 종속(Vendor Lock-in) 탈피

OpenRouter는 단일 제공사가 아닌 **다수의 AI 모델을 중계하는 플랫폼**입니다.
특정 제공사의 정책 변경에 의존하지 않고, 추후 모델 변경(GPT-4o, Claude 등)도 환경변수 한 줄로 전환 가능합니다.

---

### 변경 내용 요약

| 항목 | 변경 전 | 변경 후 |
|---|---|---|
| AI 제공자 | Google Gemini | OpenRouter |
| 모델 | gemini-2.0-flash | meta-llama/llama-3.3-70b-instruct:free |
| SDK | `google-genai` | `openai` |
| 인증 방식 | `GOOGLE_API_KEY` (AQ. 토큰) | `OPENROUTER_API_KEY` (sk-or-v1-...) |
| 폴백 모델 | gemini-2.0-flash-lite 등 | llama-3.1-8b-instruct:free |
| 재시도 전략 | 단순 sleep | 지수 백오프 (1s → 2s → 4s) |

---

### 환경변수 설정

`.env.example`을 참고하여 `.env`를 설정하세요.

```env
OPENROUTER_API_KEY=sk-or-v1-your-key-here
AI_MODEL=meta-llama/llama-3.3-70b-instruct:free
PORT=8000
PYTHONUNBUFFERED=1
CORS_ORIGIN=http://localhost:3000
```

OpenRouter API Key 발급: [openrouter.ai](https://openrouter.ai) → 로그인 → Keys → Create Key

---

### 실행 방법

```bash
cd AI
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
