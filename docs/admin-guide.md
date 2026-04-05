# 관리자 가이드

## 접근 방법

브라우저에서 `/admin` 경로로 접속. `role='admin'` 사용자만 접근 가능.

## 페이지 구성

### 1. 대시보드 (`/admin`)
- 전체 사용자 수, 오늘 검색 수, 총 북마크, 활성 공지
- 최근 7일 인기 검색어

### 2. 사용자 관리 (`/admin/users`)
- 사용자 목록 (이름, 이메일, 역할, 로그인 방식, 가입일)
- 역할 변경 (user ↔ admin)
- 이름/이메일 검색

### 3. 카테고리 관리 (`/admin/categories`)
- 홈 화면에 표시되는 카테고리 CRUD
- 슬러그, 이름, 아이콘(이모지), 검색 쿼리 설정
- 활성/비활성 토글, 순서 변경

### 4. 큐레이션 콘텐츠 (`/admin/curated`)
- YouTube 검색 → 결과에서 큐레이션 추가
- 카테고리별 필터
- 활성/비활성 토글

### 5. 앱 설정 (`/admin/config`)

#### AI 설정
- 시스템 프롬프트 (AI 성격/역할 정의)
- 온도 (0.0~2.0, 창의성 조절)
- 최대 토큰 수 (응답 길이 제한)
- 인사말 메시지

#### YouTube 설정
- 안전 검색 레벨 (strict/moderate/none)
- 검색 언어, 기본 결과 수
- 오디오북 검색 접미사 (검색어에 자동 추가)
- 차단 채널/키워드 (JSON 배열)

#### 음성 인식 설정
- STT 제공자 (Web Speech API / Whisper)
- 기본 언어

#### 앱 설정
- 유지보수 모드 토글

### 6. 공지사항 (`/admin/announcements`)
- 유형: 정보(파란), 주의(노란), 긴급(빨간)
- 활성/비활성 토글
- 시작/종료 일시 설정 가능

### 7. 분석 대시보드 (`/admin/analytics`)
- 기간 선택 (7/30/90일)
- 일별 검색량 (선 차트)
- 음성 vs 텍스트 검색 비율 (파이 차트)
- 인기 검색어 Top 10 (막대 차트)
- 사용자 가입 추이 (선 차트)
- 인기 북마크 콘텐츠

## app_config 키 목록

| 키 | 기본값 | 설명 |
|----|--------|------|
| `ai.systemPrompt` | (내장 프롬프트) | AI 시스템 프롬프트 |
| `ai.temperature` | 0.7 | LLM 온도 |
| `ai.maxTokens` | 2048 | 최대 응답 토큰 |
| `ai.greetingMessage` | (내장 인사말) | 채팅 인사말 |
| `youtube.safeSearch` | strict | 안전 검색 |
| `youtube.relevanceLanguage` | ko | 검색 언어 |
| `youtube.audiobookSuffix` | 오디오북 | 검색 접미사 |
| `youtube.defaultMaxResults` | 10 | 결과 수 |
| `youtube.blockedChannels` | [] | 차단 채널 |
| `youtube.blockedKeywords` | [] | 차단 키워드 |
| `stt.provider` | webSpeech | STT 제공자 |
| `stt.language` | ko-KR | STT 언어 |
| `app.maintenanceMode` | false | 유지보수 모드 |
