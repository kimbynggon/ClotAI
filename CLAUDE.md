* 답변은 무조건 한국어로 답변해줘


## 프로젝트 개요 
AI 기반 패션 추천 웹 서비스
사용자는 자신의 체형과 스타일 정보를 입력하고 AI는 날씨 정보와 사용자의 데이터를 기반으로 OOTD를 추천한다. 

코드/파일 작성규칙 
각 엔드포인트 작업은 API형태로 작업한다.

## MVP 기능

1. 회원가입
2. 로그인(JWT)
3. 사용자 프로필 등록
4. 체형 정보 등록
5. 날씨 조회
6. AI OOTD 추천
7. 추천 결과 저장
8. 추천 이력 조회

## API Rules

REST API 사용

응답 형식 통일

{
  "success": true,
  "message": "",
  "data": {}
}

## API Test Rules

모든 API는 Bruno 테스트 파일을 생성한다.

위치

docs/bruno

형태

auth/signup.bru
auth/login.bru

profile/create-profile.bru

recommendation/create.bru

## Development Rules

파일 수정 전

1. 수정할 파일 목록
2. 수정 이유
3. 작업 내용

을 먼저 설명한다.

바로 코드를 작성하지 않는다.

## TypeScript Rules

any 사용 금지

DTO 작성 필수

Interface 또는 Type 사용

타입 안정성을 우선한다.

eslint 오류 없이 작성한다.

## Database Rules

DB 변경 시

1. ERD 변경 내용 설명
2. SQL 작성
3. FK 설명

을 함께 작성한다.

## Prisma Rules

모든 DB 작업은 Prisma를 사용한다.

Raw Query 사용은 최소화한다.

Prisma Schema 기준으로 관리한다.

ERD 변경 시

1. schema.prisma 수정
2. migration 생성
3. SQL 변경사항 설명

을 함께 작성한다.

## NestJS Rules

모든 기능은 Module 단위로 작성한다.

Controller
Service
DTO

구조를 유지한다.

비즈니스 로직은 Controller에 작성하지 않는다.

## Next.js Rules

App Router 사용

Client Component 최소화

Server Component 우선 사용

API 호출은 Service Layer로 분리한다.

## Environment Rules

FE/.env

BE/.env

AI/.env

각 서비스별로 분리 관리한다.

실제 .env는 생성하지 않는다.

.env.example만 생성한다.


## Logging Rules


로그 형식
모든 API 요청은 로그를 기록한다.


[시간]
[HTTP METHOD]
[URL]
[STATUS]
[응답시간]

로그 파일은

/log/YYYY-MM-DD.log

형태로 저장한다.

## AI Rules

AI 기능은 FastAPI 서버에서 처리한다.

NestJS는 AI API Gateway 역할을 수행한다.

Prompt 파일은 별도 관리한다.

prompt/
├─ ootd_prompt_v1.txt
├─ ootd_prompt_v2.txt

## Git Rules

커밋 메시지 규칙

feat:
fix:
refactor:
docs:
chore:

형태 사용

## 기술스택 
Front-end
- Next.js
- React
- TypeScript

Backend
- Nest.js
- Node.js

ORM
- Prisma

AI
- Python
- FastAPI

Database
- PostgreSQL

Test
- Bruno

Version Control
- Git

## Swagger Rules

모든 API는 Swagger 문서를 작성한다.

DTO 기준으로 문서화한다.