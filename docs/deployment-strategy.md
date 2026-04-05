# APPATREE 배포 전략

## 1. 개요

APPATREE는 React 19 + Vite 프론트엔드와 Express.js + tRPC 백엔드로 구성된 풀스택 모노리스 앱이다. 배포 시 프론트엔드(SPA)와 백엔드(API 서버)를 함께 서빙해야 한다.

---

## 2. 플랫폼 비교: Vercel vs Cloudflare

### 2.1 요약 비교표

| 항목 | Vercel | Cloudflare |
|------|--------|------------|
| **Express.js 호환** | `@vercel/node` 어댑터로 가능 | **불가** (V8 isolate, Express 미지원) |
| **MySQL 연결** | Serverless pooling 필요 | Hyperdrive 필요, mysql2 호환 불안정 |
| **한국 리전** | 서울 엣지 노드 | 서울 포함 300+ 엣지 |
| **Cold Start** | 250-500ms | ~5ms (Workers) |
| **리팩터링 비용** | 1-2일 | 2-4주 (백엔드 전면 재작성) |
| **무료 티어** | 100GB 대역폭, 100GB-hrs | 100K req/day, 무제한 정적 대역폭 |
| **PWA 지원** | 완전 지원 | 완전 지원 |
| **WebSocket** | 미지원 (서버리스) | Durable Objects로 지원 |
| **빌드 파이프라인** | Vite 네이티브 지원 | Pages는 정적만, Workers는 별도 |
| **환경 변수** | 대시보드 UI, 환경별 분리 | Wrangler CLI / 대시보드 |

### 2.2 Vercel 상세

**장점:**
- `@vercel/node` 어댑터로 Express.js를 서버리스 함수로 래핑 가능
- Vite 빌드 네이티브 지원
- 서울 엣지 노드로 한국 사용자에게 빠른 정적 자산 전달
- Git push 기반 자동 배포, 브랜치별 Preview 환경
- 우수한 모니터링/분석 대시보드

**단점:**
- 서버리스 환경에서 MySQL 커넥션 관리 복잡 (cold start마다 새 연결)
- 실행 시간 제한: Hobby 10초, Pro 60초
- WebSocket 미지원 (향후 실시간 기능 제약)
- Cold Start 250-500ms (시니어 UX에 영향 가능)

**필요한 코드 변경:**
```
1. api/index.ts 생성 - Express 앱 export (server.listen() 제거)
2. vercel.json 생성 - 라우팅 설정 (/api/* → 함수, 나머지 → 정적)
3. server/db.ts - mysql2 connection pool 적용 (connectionLimit: 1)
4. package.json - vercel-build 스크립트 추가
```

### 2.3 Cloudflare 상세

**장점:**
- Workers의 near-zero cold start (~5ms)
- 300+ 글로벌 엣지, 한국 내 다수 PoP
- Pages 무료 티어 무제한 정적 대역폭
- Durable Objects로 WebSocket 지원

**단점:**
- **Express.js 실행 불가** (V8 isolate 환경, Node.js API 미지원)
- mysql2 드라이버 호환 불가 (TCP 소켓 미지원)
- 백엔드 전면 재작성 필요 (Hono/itty-router로 전환)
- D1은 SQLite만 지원, MySQL은 Hyperdrive 프록시 필요
- Workers CPU 시간 제한: 무료 10ms, 유료 30초

**필요한 코드 변경:**
```
1. 백엔드 프레임워크 전환: Express → Hono 또는 itty-router
2. DB 드라이버 교체: mysql2 → Hyperdrive 호환 드라이버
3. 모든 Node.js 빌트인(http, net, fs) → Web API 대체
4. axios → fetch 전환
5. tRPC 어댑터 변경: Express → Fetch adapter
6. 예상 소요: 2-4주
```

---

## 3. 권장 배포 전략

### 3.1 최우선 추천: Vercel

현재 아키텍처에서 가장 적은 변경으로 배포 가능한 플랫폼.

**배포 구성:**
```
[사용자] → [Vercel Edge (서울)]
              ├── 정적 자산 (dist/public/) → CDN 캐시
              └── /api/* → Serverless Function (Express.js)
                            └── MySQL (외부 DB 서비스)
```

### 3.2 최적 추천: 하이브리드 (VPS + CDN)

Express.js를 수정 없이 배포하고 CDN으로 성능 최적화.

**배포 구성:**
```
[사용자] → [Cloudflare CDN]
              ├── 정적 자산 → 엣지 캐시 (< 50ms)
              └── /api/* → [Fly.io/Railway 서울/도쿄]
                            ├── Express.js (상시 실행)
                            └── MySQL (persistent connection)
```

**장점:**
- 코드 변경 불필요 (`node dist/index.js` 그대로)
- Cold start 없음 (상시 실행 프로세스)
- MySQL 커넥션 풀링 안정적
- 정적 자산은 Cloudflare 엣지에서 < 50ms 응답
- 향후 WebSocket 추가 용이

**추천 VPS 플랫폼:**

| 플랫폼 | 한국 근접 리전 | 무료 티어 | 유료 | 특징 |
|--------|---------------|----------|------|------|
| **Fly.io** | 서울(ICN), 도쿄(NRT) | 3 shared VM | ~$5-7/월 | 서울 리전 직접 배포 가능 |
| **Railway** | 도쿄 | $5 크레딧/월 | ~$5-10/월 | Zero-config, MySQL 애드온 |
| **Render** | 싱가포르 | 750시간/월 | $7/월 | 간단, Git 자동 배포 |

---

## 4. 환경 변수 설정 가이드

배포 플랫폼에 설정해야 할 환경 변수:

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `VITE_APP_ID` | 애플리케이션 ID | `appatree` |
| `JWT_SECRET` | 쿠키 서명 시크릿 | `your-secret-key` |
| `DATABASE_URL` | MySQL 연결 문자열 | `mysql://user:pass@host:3306/db` |
| `OAUTH_SERVER_URL` | OAuth 서버 URL | `https://oauth.example.com` |
| `OWNER_OPEN_ID` | 관리자 OAuth ID | `admin-open-id` |
| `NODE_ENV` | 실행 환경 | `production` |
| `BUILT_IN_FORGE_API_URL` | Forge API 엔드포인트 | `https://forge.example.com` |
| `BUILT_IN_FORGE_API_KEY` | Forge API 키 | `forge-api-key` |
| `VITE_OAUTH_PORTAL_URL` | OAuth 포털 URL | `https://portal.example.com` |

---

## 5. 단계별 배포 절차

### Vercel 배포 (Option A)

```bash
# 1. Vercel CLI 설치
npm i -g vercel

# 2. vercel.json 생성 (프로젝트 루트)
# 3. api/index.ts 생성 (Express 앱 export)
# 4. 환경 변수 설정 (Vercel 대시보드)

# 5. 배포
vercel --prod
```

### 하이브리드 배포 (Option B - 추천)

```bash
# 1. Fly.io CLI 설치
curl -L https://fly.io/install.sh | sh

# 2. 앱 생성 (서울 리전)
fly launch --region icn

# 3. 환경 변수 설정
fly secrets set DATABASE_URL="mysql://..." JWT_SECRET="..."

# 4. 배포
fly deploy

# 5. Cloudflare DNS 설정 (선택)
# - DNS를 Cloudflare로 변경
# - Page Rules: /assets/* → Cache Everything
# - /api/* → Bypass Cache
```

---

## 6. 결론

| 시나리오 | 추천 플랫폼 | 이유 |
|---------|------------|------|
| 빠른 배포 (코드 변경 최소) | **Fly.io + Cloudflare CDN** | Express 그대로, 서울 리전 |
| Serverless 선호 | **Vercel** | 1-2일 리팩터링, 좋은 DX |
| 정적 사이트만 배포 | **Cloudflare Pages** | 무료, 빠름 |
| Cloudflare 올인 | **비추천** | 백엔드 전면 재작성 필요 |
