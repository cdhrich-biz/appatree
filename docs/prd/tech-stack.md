# 기술 스택 및 아키텍처

## 1. 아키텍처 개요

```
┌─────────────────────────────────────────────┐
│                  클라이언트                    │
│  React 19 + Vite 7 + Tailwind CSS 4         │
│  Wouter (라우팅) + TanStack Query (상태)      │
│  Web Speech API (STT/TTS)                    │
├─────────────────── tRPC ────────────────────┤
│                   서버                        │
│  Express.js + tRPC Router                    │
│  OAuth + JWT 인증                            │
├──────────────────────────────────────────────┤
│                 데이터 계층                    │
│  MySQL + Drizzle ORM                         │
│  AWS S3 (파일 스토리지)                       │
│  localStorage (클라이언트 상태)               │
└──────────────────────────────────────────────┘
```

## 2. 프론트엔드

| 기술 | 버전 | 용도 |
|------|------|------|
| React | 19.2.1 | UI 프레임워크 |
| Vite | 7.x | 빌드 도구 + 개발 서버 |
| Tailwind CSS | 4.x | 유틸리티 CSS |
| Wouter | 3.3.5 | 클라이언트 라우팅 |
| TanStack React Query | - | 서버 상태 관리 |
| Radix UI | - | 접근성 UI 프리미티브 (60+ 컴포넌트) |
| React Hook Form | - | 폼 관리 |
| Zod | - | 스키마 유효성 검증 |
| Framer Motion | - | 애니메이션 |
| Recharts | - | 차트 |
| Lucide React | - | 아이콘 |
| Sonner | - | 토스트 알림 |

## 3. 백엔드

| 기술 | 용도 |
|------|------|
| Express.js | HTTP 서버 |
| tRPC | 타입 안전 API (RPC) |
| Drizzle ORM | MySQL 쿼리 빌더 |
| mysql2 | MySQL 드라이버 |
| jose | JWT 서명/검증 |
| axios | 외부 API 호출 |
| AWS S3 SDK | 파일 스토리지 |
| OpenAI API | AI 채팅 추천 |

## 4. 데이터베이스 스키마

### Users 테이블

```sql
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  open_id       VARCHAR(255) NOT NULL UNIQUE,
  name          VARCHAR(255),
  email         VARCHAR(255),
  login_method  VARCHAR(50),
  role          ENUM('user', 'admin') DEFAULT 'user',
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
);
```

## 5. 빌드 파이프라인

```bash
# 개발
pnpm dev          # Vite dev server + tsx watch (포트 3000)

# 프로덕션 빌드
pnpm build        # vite build → dist/public/ + esbuild → dist/index.js

# 프로덕션 실행
pnpm start        # node dist/index.js (포트 3000)

# 기타
pnpm check        # tsc --noEmit (타입 검사)
pnpm test         # vitest (단위 테스트)
pnpm db:push      # Drizzle 마이그레이션
```

## 6. 프로젝트 구조

```
appatree/
├── client/                   # 프론트엔드
│   ├── src/
│   │   ├── pages/           # 라우트 페이지 (7개)
│   │   ├── components/      # 재사용 컴포넌트
│   │   │   └── ui/          # shadcn/ui (60+)
│   │   ├── contexts/        # React Context
│   │   ├── hooks/           # 커스텀 훅
│   │   ├── lib/             # 유틸리티
│   │   ├── App.tsx          # 라우터
│   │   └── main.tsx         # 엔트리포인트
│   └── public/              # 정적 자산 (manifest, SW)
├── server/                   # 백엔드
│   ├── _core/               # 코어 인프라
│   │   ├── index.ts         # Express 앱 + 서버 시작
│   │   ├── trpc.ts          # tRPC 프로시저
│   │   ├── context.ts       # tRPC 컨텍스트
│   │   ├── oauth.ts         # OAuth 플로우
│   │   ├── env.ts           # 환경 변수
│   │   └── db.ts            # DB 연결
│   ├── routers.ts           # tRPC 라우터 (인증)
│   └── storage.ts           # S3 스토리지
├── shared/                   # 공유 타입/상수
├── drizzle/                  # DB 스키마/마이그레이션
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 7. 외부 서비스 연동

| 서비스 | 상태 | 용도 |
|--------|------|------|
| YouTube Data API v3 | 미연동 (목업) | 오디오북 검색 |
| YouTube IFrame API | 연동 완료 | 영상 재생 |
| OpenAI API | 준비됨 (시뮬레이션) | AI 추천 채팅 |
| Web Speech API | 연동 완료 | STT/TTS |
| OAuth 서버 | 연동 완료 | 사용자 인증 |
| AWS S3 | 준비됨 | 파일 스토리지 |
