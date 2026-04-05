# APPATREE (아빠트리) 프로젝트 문서

## 프로젝트 개요

시니어(고령자) 대상 **음성 기반 오디오북 검색 및 재생** 웹 애플리케이션.
음성 인식으로 책을 검색하고, YouTube에서 오디오북을 찾아 재생하며, AI 채팅으로 맞춤 추천을 받을 수 있다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | React 19, TypeScript, Tailwind v4, Wouter, Radix UI |
| 백엔드 | Express, tRPC v11, Drizzle ORM |
| 데이터베이스 | **Supabase PostgreSQL** |
| 인증 | OAuth + JWT 세션 쿠키 |
| AI | Gemini 2.5 Flash (Forge API) |
| 음성 | Web Speech API (브라우저) + Whisper STT (서버) |
| 외부 API | YouTube Data API v3 |
| 빌드 | Vite 7, esbuild |
| 배포 | Vercel (Git 연동) |

## 디렉토리 구조

```
appatree/
├── client/                    # 프론트엔드
│   └── src/
│       ├── pages/             # 사용자 페이지 (6개)
│       ├── pages/admin/       # 관리자 페이지 (7개)
│       ├── components/        # UI 컴포넌트 (50+)
│       ├── _core/hooks/       # useAuth
│       ├── lib/               # tRPC 클라이언트
│       └── contexts/          # ThemeContext
├── server/                    # 백엔드
│   ├── _core/                 # 핵심 모듈
│   │   ├── env.ts             # 환경변수
│   │   ├── trpc.ts            # tRPC 설정
│   │   ├── oauth.ts           # OAuth
│   │   ├── youtube.ts         # YouTube API
│   │   ├── llm.ts             # LLM (Gemini)
│   │   ├── voiceTranscription.ts  # Whisper STT
│   │   └── index.ts           # Express 서버
│   ├── routers.ts             # 메인 라우터
│   ├── libraryRouter.ts       # 북마크/이력
│   ├── chatRouter.ts          # AI 채팅
│   ├── preferencesRouter.ts   # 사용자 설정
│   ├── configRouter.ts        # 공개 설정
│   ├── adminRouter.ts         # 관리자 API
│   └── voiceRouter.ts         # 음성 인식
├── drizzle/                   # DB 스키마
│   ├── schema.ts              # 테이블 정의
│   └── relations.ts           # 관계 정의
├── shared/                    # 공유 타입/상수
└── docs/                      # 문서
```

## 환경변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `DATABASE_URL` | Y | Supabase PostgreSQL 연결 문자열 |
| `JWT_SECRET` | Y | 세션 JWT 시크릿 |
| `VITE_APP_ID` | Y | OAuth 앱 ID |
| `OAUTH_SERVER_URL` | Y | OAuth 서버 URL |
| `OWNER_OPEN_ID` | N | 관리자 자동 승격 OpenID |
| `YOUTUBE_API_KEY` | Y | YouTube Data API v3 키 |
| `BUILT_IN_FORGE_API_URL` | N | Forge API (LLM/STT/Storage) |
| `BUILT_IN_FORGE_API_KEY` | N | Forge API 키 |

## 실행 방법

```bash
# 의존성 설치
pnpm install

# DB 마이그레이션 생성 및 적용
pnpm run db:push

# 개발 서버 실행
pnpm run dev

# 프로덕션 빌드
pnpm run build
pnpm run start
```
