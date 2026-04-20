// 원격 지원 세션에서 Ably 채널을 통해 오가는 이벤트 타입 정의.
// client/server 양쪽이 공유한다. 런타임 검증은 zod로 별도 수행.

// ─── 채널 규칙 ───────────────────────────────────────────────────────────────
// - `user:<userId>`         부모가 구독해 세션 요청 수신
// - `session:<sessionKey>`  활성 세션의 모든 실시간 이벤트(양쪽 구독)

export const channelForUser = (userId: number) => `user:${userId}`;
export const channelForSession = (sessionKey: string) => `session:${sessionKey}`;

// ─── 세션 라이프사이클 ───────────────────────────────────────────────────────
export type SessionRequestEvent = {
  type: "session:request";
  sessionKey: string;
  childUserId: number;
  childName: string | null;
  requestedAt: number;
};

export type SessionLifecycleEvent =
  | { type: "session:accepted"; sessionKey: string; acceptedAt: number }
  | { type: "session:rejected"; sessionKey: string }
  | { type: "session:ended"; sessionKey: string; endedBy: number; reason: string };

// ─── WebRTC 시그널링 ─────────────────────────────────────────────────────────
export type WebRTCSignalEvent =
  | { type: "webrtc:offer"; sdp: RTCSessionDescriptionInit; from: number }
  | { type: "webrtc:answer"; sdp: RTCSessionDescriptionInit; from: number }
  | { type: "webrtc:ice"; candidate: RTCIceCandidateInit; from: number };

// ─── 원격 조작 명령 (자녀 → 부모) ────────────────────────────────────────────
export type TextSize = "small" | "medium" | "large";

export type PreferencePatch = Partial<{
  textSize: TextSize;
  volume: number;
  ttsSpeed: number;
  highContrast: boolean;
  autoplay: boolean;
}>;

export type RemoteActionEvent =
  | { type: "action:navigate"; path: string }
  | { type: "action:play"; videoId: string; title: string; startAt?: number }
  | { type: "action:pause" }
  | { type: "action:resume" }
  | { type: "action:seek"; seconds: number }
  | { type: "action:search"; query: string }
  | { type: "action:bookmark:add"; videoId: string; title: string }
  | { type: "action:bookmark:remove"; videoId: string }
  | { type: "action:pref:update"; patch: PreferencePatch }
  | { type: "action:highlight"; selector: string; ttlMs?: number }
  | { type: "action:speak"; message: string };

// ─── 상태 브로드캐스트 (부모 → 자녀, 미러링용) ──────────────────────────────
export type PlayerSnapshot = {
  videoId: string | null;
  title: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
} | null;

export type StateSyncEvent = {
  type: "state:sync";
  route: string;
  queryString: string;
  player: PlayerSnapshot;
  scroll: { x: number; y: number };
  timestamp: number;
};

// ─── 차단된 조작 피드백 (부모 → 자녀) ────────────────────────────────────────
export type ActionBlockedEvent = {
  type: "action:blocked";
  reason: string;
  attemptedType: string;
};

// ─── 채널별 이벤트 유니온 ────────────────────────────────────────────────────
export type UserChannelEvent = SessionRequestEvent | SessionLifecycleEvent;

export type SessionChannelEvent =
  | SessionLifecycleEvent
  | WebRTCSignalEvent
  | RemoteActionEvent
  | StateSyncEvent
  | ActionBlockedEvent;

// ─── 원격 조작 화이트리스트 ──────────────────────────────────────────────────
// 부모 기기가 수신한 action 중 여기 포함된 것만 실행한다.
// Phase 1에서 로그아웃/관리자/결제 등 민감 작업은 제외.
export const ALLOWED_REMOTE_ACTIONS = [
  "action:navigate",
  "action:play",
  "action:pause",
  "action:resume",
  "action:seek",
  "action:search",
  "action:bookmark:add",
  "action:bookmark:remove",
  "action:pref:update",
  "action:highlight",
  "action:speak",
] as const satisfies ReadonlyArray<RemoteActionEvent["type"]>;

// navigate 경로 화이트리스트: /admin, 관계 해제, 로그아웃 경로 차단
export const BLOCKED_NAVIGATE_PATH_PREFIXES = [
  "/admin",
  "/logout",
  "/oauth",
  "/settings/family", // 관계 관리 화면은 부모 직접만
] as const;

export function isNavigatePathAllowed(path: string): boolean {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return !BLOCKED_NAVIGATE_PATH_PREFIXES.some((prefix) =>
    normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
}
