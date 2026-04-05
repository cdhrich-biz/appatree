# 데이터베이스 스키마

**데이터베이스:** Supabase PostgreSQL  
**ORM:** Drizzle ORM  
**스키마 파일:** `drizzle/schema.ts`

## 테이블 목록 (10개)

### 1. users — 사용자
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | serial PK | 자동 증가 |
| open_id | varchar(64) UNIQUE | OAuth 식별자 |
| name | text | 이름 |
| email | varchar(320) | 이메일 |
| login_method | varchar(64) | 로그인 방식 (google, github 등) |
| role | enum(user, admin) | 역할 |
| created_at | timestamp | 생성일 |
| updated_at | timestamp | 수정일 |
| last_signed_in | timestamp | 마지막 로그인 |

### 2. user_preferences — 사용자 설정
| 컬럼 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| id | serial PK | | |
| user_id | integer UNIQUE | | FK → users |
| text_size | enum(small, medium, large) | medium | 글씨 크기 |
| volume | integer | 70 | 음량 (0-100) |
| tts_speed | numeric(3,2) | 0.90 | TTS 속도 |
| autoplay | boolean | true | 자동재생 |
| preferred_language | varchar(10) | ko-KR | 선호 언어 |
| high_contrast | boolean | false | 고대비 모드 |
| has_seen_onboarding | boolean | false | 온보딩 완료 |

### 3. bookmarks — 즐겨찾기
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | serial PK | |
| user_id | integer | FK → users |
| video_id | varchar(32) | YouTube 영상 ID |
| title | text | 제목 |
| channel_name | text | 채널명 |
| thumbnail_url | text | 썸네일 URL |
| duration | varchar(32) | 재생 시간 |
| UNIQUE(user_id, video_id) | | 중복 방지 |

### 4. listening_history — 청취 이력
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | serial PK | |
| user_id | integer | FK → users |
| video_id | varchar(32) | YouTube 영상 ID |
| progress_seconds | integer | 현재 재생 위치 (초) |
| total_seconds | integer | 전체 길이 (초) |
| last_played_at | timestamp | 마지막 재생 시각 |
| UNIQUE(user_id, video_id) | | 이어듣기용 |

### 5. search_logs — 검색 로그
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | serial PK | |
| user_id | integer nullable | FK → users |
| query | text | 검색어 |
| result_count | integer | 결과 수 |
| source | enum(voice, text, category) | 검색 방식 |
| created_at | timestamp | 검색 시각 |

### 6. chat_sessions — AI 채팅 세션
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | serial PK | |
| user_id | integer | FK → users |
| title | varchar(200) | 대화 제목 (자동 생성) |

### 7. chat_messages — 채팅 메시지
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | serial PK | |
| session_id | integer | FK → chat_sessions |
| role | enum(user, assistant, system) | 발화자 |
| content | text | 메시지 내용 |

### 8. categories — 카테고리 (관리자 관리)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | serial PK | |
| slug | varchar(64) UNIQUE | 영문 식별자 |
| name | varchar(100) | 한국어 이름 |
| icon | varchar(10) | 이모지 아이콘 |
| search_query | varchar(200) | 기본 검색 쿼리 |
| sort_order | integer | 정렬 순서 |
| is_active | boolean | 활성 여부 |

### 9. app_config — 앱 설정 (KV)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | serial PK | |
| config_key | varchar(128) UNIQUE | 설정 키 |
| config_value | text | 설정 값 (JSON) |
| description | text | 설명 |
| updated_by | integer | 수정한 관리자 |

### 10. announcements — 공지사항
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | serial PK | |
| title | varchar(200) | 제목 |
| content | text | 내용 |
| type | enum(info, warning, urgent) | 유형 |
| is_active | boolean | 활성 여부 |
| start_at / end_at | timestamp nullable | 표시 기간 |

## ER 다이어그램 (관계)

```
users ──┬── user_preferences  (1:1)
        ├── bookmarks          (1:N)
        ├── listening_history  (1:N)
        ├── search_logs        (1:N)
        └── chat_sessions      (1:N)
                └── chat_messages  (1:N)

categories ── curated_content  (1:N via category_slug)
```
