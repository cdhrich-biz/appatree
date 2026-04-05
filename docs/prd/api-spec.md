# API 명세

## 1. tRPC 라우터 구조

```
appRouter
├── auth
│   ├── auth.me          → 현재 사용자 정보
│   └── auth.logout      → 로그아웃 (쿠키 삭제)
└── system
    └── (시스템 라우트)
```

## 2. 인증 API

### `auth.me` (Query)

현재 로그인한 사용자 정보를 반환.

- **인증**: 필요 (JWT 쿠키)
- **응답**:
```typescript
{
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}
```

### `auth.logout` (Mutation)

세션 쿠키를 삭제하여 로그아웃.

- **인증**: 필요
- **응답**: `{ success: true }`

## 3. OAuth 엔드포인트

### `GET /api/oauth/callback`

OAuth 인증 콜백. 외부 OAuth 서버에서 리다이렉트.

- **파라미터**: OAuth 서버에서 전달하는 code/state
- **동작**: JWT 생성 → 쿠키 설정 → 홈으로 리다이렉트

## 4. 시스템 API

### `GET /api/trpc/*`

tRPC 쿼리/뮤테이션 엔드포인트.

- **미들웨어**: `createExpressMiddleware`
- **컨텍스트**: 요청에서 JWT 추출 → 사용자 인증

## 5. 정적 자산 서빙

### 프로덕션
- `dist/public/*` → Express `serveStatic` 미들웨어
- SPA 폴백: 모든 미매칭 경로 → `index.html`

### 개발
- Vite 개발 서버 프록시

## 6. 클라이언트 상태 (localStorage)

서버 API를 사용하지 않는 로컬 데이터:

| 키 | 타입 | 용도 |
|----|------|------|
| `appatree-bookmarks` | `Array<BookItem>` | 즐겨찾기 목록 |
| `appatree-recent` | `Array<BookItem>` | 최근 재생 목록 |
| `appatree-settings` | `Settings` | 사용자 설정 |
| `appatree-sidebar-width` | `number` | 사이드바 너비 |

### BookItem 타입
```typescript
interface BookItem {
  id: string;        // YouTube video ID
  title: string;
  channel: string;
  thumbnail: string;
  duration: string;
  lastPlayed?: string; // ISO date
}
```

### Settings 타입
```typescript
interface Settings {
  fontSize: 'small' | 'medium' | 'large';
  volume: number;      // 0-100
  ttsSpeed: number;    // 0.75 | 0.9 | 1.0 | 1.25
  autoplay: boolean;
}
```

## 7. 향후 API (미구현)

### YouTube 검색 (Phase 3)

```typescript
// tRPC procedure (계획)
search.query({
  query: string;
  sort: 'relevance' | 'date' | 'viewCount';
  pageToken?: string;
}) → {
  items: YouTubeVideo[];
  nextPageToken: string;
}
```

### AI 채팅 (Phase 5 - 시뮬레이션 중)

```typescript
// tRPC procedure (계획)
chat.send({
  message: string;
  history: ChatMessage[];
}) → {
  reply: string;
  recommendations?: BookItem[];
}
```
