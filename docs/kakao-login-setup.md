# 카카오 로그인 외부 설정 가이드

APPATREE에 카카오 로그인을 동작시키려면 **카카오 개발자 센터**, **Supabase 대시보드**, **Vercel** 세 곳에 설정이 필요합니다. 한 번만 하면 되고 15~20분 정도 걸립니다.

## 전제

- Supabase 프로젝트: `bbpnyqwyqqwidnccohmd.supabase.co` (이미 운영 중)
- Vercel 프로젝트: `cdhnayas-projects/appatree` → 도메인 `appatree-blue.vercel.app`
- 카카오 계정: 로그인 가능한 카카오 계정 (서비스 대표자 계정 권장)

---

## 1단계 · 카카오 개발자 센터에서 앱 만들기

### 1.1 계정 로그인 & 앱 생성
1. https://developers.kakao.com 접속 → 우상단 **"로그인"** → 카카오 계정 로그인
2. 최초 로그인이면 개발자 등록 약관 동의
3. 상단 메뉴 **"내 애플리케이션"** → **"애플리케이션 추가하기"**
4. 앱 정보 입력:
   - 앱 이름: `APPATREE`
   - 사업자명(선택): 개인 또는 법인명
   - 카테고리: `콘텐츠 > 도서/오디오북`
5. **"저장"** 클릭 → 앱 상세 페이지 진입

### 1.2 앱 키 확인
- 좌측 메뉴 **"앱 설정 → 요약 정보"**
- **REST API 키**를 복사해둡니다 (나중에 Supabase에 넣을 Client ID)

### 1.3 플랫폼 등록
1. 좌측 메뉴 **"앱 설정 → 플랫폼"** → **"Web 플랫폼 등록"**
2. **사이트 도메인**에 아래 두 줄 모두 추가:
   ```
   https://appatree-blue.vercel.app
   https://appatree-cdhnayas-projects.vercel.app
   ```
   (로컬 개발도 쓰려면 `http://localhost:5173` 추가)
3. **"저장"**

### 1.4 카카오 로그인 활성화 & Redirect URI
1. 좌측 메뉴 **"제품 설정 → 카카오 로그인"**
2. **"활성화 설정"** 우측 토글을 **ON** (회색→파랑)으로 변경
3. 아래 **"Redirect URI"** 섹션에 다음 한 줄 등록:
   ```
   https://bbpnyqwyqqwidnccohmd.supabase.co/auth/v1/callback
   ```
   (로컬도 쓰면 추가로 `http://localhost:54321/auth/v1/callback`)
4. **"저장"**

### 1.5 동의 항목 설정
1. 좌측 메뉴 **"제품 설정 → 카카오 로그인 → 동의 항목"**
2. 아래 3개 항목 각각 **"설정"** 클릭 → 동의 단계 지정:

| 항목 | 동의 단계 |
|---|---|
| 닉네임 | **필수 동의** |
| 프로필 사진 | **선택 동의** |
| 카카오계정(이메일) | **필수 동의** |

> 이메일을 "필수 동의"로 하려면 **비즈니스 앱**으로 전환해야 할 수 있습니다. 일단은 **선택 동의**로 두고, 필요 시 비즈앱 심사를 신청하세요. 이메일 미수집 상태에서도 카카오 로그인은 정상 동작합니다.

### 1.6 Client Secret 발급 (보안 강화)
1. 좌측 메뉴 **"제품 설정 → 카카오 로그인 → 보안"**
2. **"Client Secret 코드 생성"** 클릭 → 생성된 코드를 복사해둡니다
3. **"활성화 상태" → "사용함"**으로 변경 후 저장

---

## 2단계 · Supabase 대시보드에서 Kakao Provider 연결

### 2.1 Authentication → Providers
1. https://supabase.com/dashboard/project/bbpnyqwyqqwidnccohmd/auth/providers 접속
2. 목록에서 **"Kakao"** 찾아 클릭 → 우측 슬라이드 패널 열림
3. 다음 값 입력:
   - **Enable Sign in with Kakao**: ON
   - **Kakao Client ID**: *(1.2에서 복사한 REST API 키)*
   - **Kakao Client Secret**: *(1.6에서 복사한 Client Secret 코드)*
   - Callback URL: `https://bbpnyqwyqqwidnccohmd.supabase.co/auth/v1/callback` (자동 표시)
4. **"Save"** 클릭

### 2.2 URL Configuration
1. 좌측 메뉴 **Authentication → URL Configuration**
2. **Site URL**에 `https://appatree-blue.vercel.app`
3. **Redirect URLs**(허용 목록)에 아래를 **모두** 추가:
   ```
   https://appatree-blue.vercel.app/auth/callback
   https://appatree-cdhnayas-projects.vercel.app/auth/callback
   http://localhost:5173/auth/callback
   ```
4. **"Save"**

---

## 3단계 · Vercel 환경변수 등록

### 3.1 필수 변수 3개
https://vercel.com/cdhnayas-projects/appatree/settings/environment-variables 접속 → **"Add New"** 3번 반복:

| Key | Value | Environments |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://bbpnyqwyqqwidnccohmd.supabase.co` | Production + Preview |
| `VITE_SUPABASE_ANON_KEY` | *(Supabase Settings → API → anon public key 값 그대로)* | Production + Preview |
| `ABLY_API_KEY` | *(이미 등록했으면 skip)* | Production + Preview |

이미 `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`가 등록되어 있다면 그건 그대로 두세요(서버 전용). `VITE_` 접두사가 붙은 두 변수는 **브라우저 측 코드에서 필요**하므로 별도로 추가합니다.

### 3.2 재배포
1. 환경변수 저장 후 **Deployments** 탭 → 최신 배포 우측 **"⋯" → Redeploy**
2. 또는 다음 Git push 시 자동 반영 (이번 세션의 카카오 로그인 커밋이 이미 푸시되어 있다면 3.1만 등록하면 됨)

---

## 4단계 · 동작 확인

1. 프로덕션 URL(https://appatree-blue.vercel.app) 접속 (시크릿 창 권장)
2. 홈에 **"카카오톡으로 시작하기"** 노란 버튼이 보여야 함
3. 버튼 클릭 → 카카오 로그인 페이지 → 동의 → `/auth/callback` → 홈
4. 홈 상단의 "로그인 필요" 카드가 사라지고, 원격 지원 기능(도움 요청)이 정상 동작
5. 설정 → 로그인 섹션에서 로그아웃 가능
6. Supabase 대시보드 → Authentication → Users 탭에서 새 사용자 행이 생성됐는지 확인

## 5단계 · 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| 카카오 페이지에서 "앱 관리자 등록 필요" | 앱이 **테스트 모드**인데 내 카카오 계정이 "앱 관리자"로 등록 안 됨 | 개발자센터 → 팀 관리 → 본인 카카오 계정 추가. 또는 비즈앱 심사 |
| "invalid_redirect_uri" | 카카오 Redirect URI와 Supabase Callback URL 불일치 | 1.4에서 반드시 `/auth/v1/callback`까지 입력 |
| 로그인 후 빈 페이지 | Vercel에 VITE_SUPABASE_* 환경변수 없음 | 3.1 재확인 + 재배포 |
| "Invalid API key" | ANON_KEY를 service_role key로 잘못 복사 | Supabase Settings → API → **anon public** key 사용 |
| 자녀/부모 연결은 되는데 원격 조작 실패 | ABLY_API_KEY 미등록 | 3.1에 `ABLY_API_KEY` 추가 |

## 6단계 · 카카오 비즈앱 전환(선택, 추후)

초기에는 테스트 모드(앱 관리자만 로그인 가능)로 시작할 수 있지만, 일반 사용자에게 오픈하려면 **비즈앱**으로 전환해야 합니다.
- 사업자 등록증 또는 비영리 단체 확인 서류 필요
- 심사 2~5영업일
- 비즈앱 전환 후 **이메일 필수 동의**, **카카오톡 메시지 전송** 등 추가 기능 사용 가능

비즈앱 심사는 baerta(아빠트리) 서비스가 어느 정도 안정화된 후 진행하는 것을 권장합니다.

## 참고 링크
- 카카오 개발자 센터: https://developers.kakao.com
- 카카오 로그인 공식 문서: https://developers.kakao.com/docs/latest/ko/kakaologin/common
- Supabase Kakao Auth 문서: https://supabase.com/docs/guides/auth/social-login/auth-kakao
