# API 레퍼런스

**프로토콜:** tRPC v11 (HTTP batch link)  
**엔드포인트:** `POST /api/trpc/:procedure`  
**인증:** JWT 세션 쿠키 (`app_session_id`)

## 접근 수준

| 수준 | 설명 |
|------|------|
| `public` | 인증 불필요 |
| `protected` | 로그인 필수 |
| `admin` | role='admin' 필수 |

---

## auth (인증)

| 프로시저 | 수준 | 타입 | 설명 |
|----------|------|------|------|
| `auth.me` | public | query | 현재 사용자 정보 반환 |
| `auth.logout` | public | mutation | 세션 쿠키 삭제 |

## youtube (YouTube)

| 프로시저 | 수준 | 타입 | 입력 | 설명 |
|----------|------|------|------|------|
| `youtube.search` | public | query | query, maxResults?, order?, pageToken? | 영상 검색 |
| `youtube.video` | public | query | videoId | 영상 상세 |
| `youtube.channel` | public | query | channelId | 채널 정보 |
| `youtube.playlist` | public | query | playlistId, maxResults? | 플레이리스트 |

## voice (음성)

| 프로시저 | 수준 | 타입 | 입력 | 설명 |
|----------|------|------|------|------|
| `voice.transcribe` | protected | mutation | audioUrl, language?, prompt? | Whisper STT |

## library (서재)

| 프로시저 | 수준 | 타입 | 입력 | 설명 |
|----------|------|------|------|------|
| `library.addBookmark` | protected | mutation | videoId, title, channelName?, ... | 북마크 추가 |
| `library.removeBookmark` | protected | mutation | videoId | 북마크 삭제 |
| `library.bookmarks` | protected | query | limit?, offset? | 북마크 목록 |
| `library.isBookmarked` | protected | query | videoId | 북마크 여부 |
| `library.addHistory` | protected | mutation | videoId, title, progressSeconds, ... | 이력 추가 |
| `library.history` | protected | query | limit?, offset? | 이력 목록 |
| `library.updateProgress` | protected | mutation | videoId, progressSeconds, totalSeconds? | 진행 저장 |
| `library.clearHistory` | protected | mutation | - | 이력 전체 삭제 |
| `library.clearBookmarks` | protected | mutation | - | 북마크 전체 삭제 |

## chat (AI 채팅)

| 프로시저 | 수준 | 타입 | 입력 | 설명 |
|----------|------|------|------|------|
| `chat.send` | protected | mutation | sessionId?, message | 메시지 전송 → AI 응답 |
| `chat.sessions` | protected | query | - | 세션 목록 |
| `chat.history` | protected | query | sessionId | 대화 이력 |
| `chat.deleteSession` | protected | mutation | sessionId | 세션 삭제 |
| `chat.greeting` | protected | query | - | 인사말 조회 |

## preferences (설정)

| 프로시저 | 수준 | 타입 | 입력 | 설명 |
|----------|------|------|------|------|
| `preferences.get` | protected | query | - | 설정 조회 |
| `preferences.update` | protected | mutation | textSize?, volume?, ... | 설정 저장 |

## config (공개 설정)

| 프로시저 | 수준 | 타입 | 설명 |
|----------|------|------|------|
| `config.categories` | public | query | 활성 카테고리 목록 |
| `config.announcements` | public | query | 현재 활성 공지 |
| `config.appSettings` | public | query | 앱 설정 (STT 제공자, 유지보수 등) |

## admin (관리자)

### admin.users
| 프로시저 | 타입 | 설명 |
|----------|------|------|
| `admin.users.list` | query | 사용자 목록 (검색, 필터, 페이지네이션) |
| `admin.users.updateRole` | mutation | 역할 변경 |

### admin.categories
| 프로시저 | 타입 | 설명 |
|----------|------|------|
| `admin.categories.list` | query | 카테고리 전체 |
| `admin.categories.create` | mutation | 카테고리 생성 |
| `admin.categories.update` | mutation | 카테고리 수정 |
| `admin.categories.delete` | mutation | 카테고리 삭제 |
| `admin.categories.reorder` | mutation | 순서 변경 |

### admin.curated
| 프로시저 | 타입 | 설명 |
|----------|------|------|
| `admin.curated.list` | query | 큐레이션 목록 |
| `admin.curated.create` | mutation | 큐레이션 추가 |
| `admin.curated.update` | mutation | 큐레이션 수정 |
| `admin.curated.delete` | mutation | 큐레이션 삭제 |
| `admin.curated.searchYouTube` | query | YouTube 검색 (관리자용) |

### admin.config
| 프로시저 | 타입 | 설명 |
|----------|------|------|
| `admin.config.list` | query | 전체 설정 |
| `admin.config.get` | query | 특정 설정 조회 |
| `admin.config.update` | mutation | 설정 저장 |

### admin.announcements
| 프로시저 | 타입 | 설명 |
|----------|------|------|
| `admin.announcements.list` | query | 공지 목록 |
| `admin.announcements.create` | mutation | 공지 생성 |
| `admin.announcements.update` | mutation | 공지 수정 |
| `admin.announcements.delete` | mutation | 공지 삭제 |

### admin.analytics
| 프로시저 | 타입 | 설명 |
|----------|------|------|
| `admin.analytics.overview` | query | 대시보드 요약 |
| `admin.analytics.searchLogs` | query | 검색 분석 |
| `admin.analytics.userActivity` | query | 사용자 활동 |
| `admin.analytics.popularContent` | query | 인기 콘텐츠 |
