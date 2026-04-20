import { useEffect, useMemo, useState } from "react";
import { useRoute, useLocation } from "wouter";
import {
  ArrowLeft,
  Loader2,
  Radio,
  CheckCircle2,
  Home,
  Search,
  BookOpen,
  Volume2,
  MessageCircle,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  MousePointer2,
  Mic,
  MicOff,
  PhoneOff,
  PhoneCall,
} from "lucide-react";
import { useWebRTC } from "@/hooks/useWebRTC";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import { useRemoteSession } from "@/contexts/RemoteSessionContext";
import ParentMirror from "@/components/remote/ParentMirror";
import type { PlayerSnapshot, RemoteActionEvent, SessionChannelEvent } from "@shared/remoteEvents";

type Phase = "waiting" | "active" | "rejected" | "ended";

export default function RemoteHelper() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/remote/:sessionKey");
  const sessionKey = params?.sessionKey ?? "";
  const { activeSession, subscribe, publish, endActive } = useRemoteSession();

  const [phase, setPhase] = useState<Phase>(
    activeSession?.sessionKey === sessionKey ? "active" : "waiting",
  );
  const [parentRoute, setParentRoute] = useState<string | null>(null);
  const [parentQuery, setParentQuery] = useState<string>("");
  const [parentPlayer, setParentPlayer] = useState<PlayerSnapshot>(null);
  const [messageInput, setMessageInput] = useState("");
  const [pointing, setPointing] = useState(false);
  const call = useWebRTC();

  // 부모가 수락/거절/종료하는 이벤트 + 상태 싱크 수신
  useEffect(() => {
    const off = subscribe((event: SessionChannelEvent) => {
      if (event.type === "session:accepted") {
        setPhase("active");
      } else if (event.type === "session:rejected") {
        setPhase("rejected");
      } else if (event.type === "session:ended") {
        setPhase("ended");
      } else if (event.type === "state:sync") {
        setParentRoute(event.route);
        setParentQuery(event.queryString || "");
        setParentPlayer(event.player);
      } else if (event.type === "action:blocked") {
        toast.error(`부모님 기기가 거부했어요: ${event.reason}`);
      }
    });
    return off;
  }, [subscribe]);

  // activeSession 상태 반영
  useEffect(() => {
    if (activeSession?.sessionKey === sessionKey) {
      setPhase("active");
    }
  }, [activeSession, sessionKey]);

  // 세션이 종료되면 3초 후 자동으로 가족 목록으로 이동
  useEffect(() => {
    if (phase !== "ended" && phase !== "rejected") return;
    const id = setTimeout(() => navigate("/family"), 3000);
    return () => clearTimeout(id);
  }, [phase, navigate]);

  const isActive = phase === "active";
  const parentName = activeSession?.counterpartName ?? "부모님";

  const sendAction = async (event: RemoteActionEvent) => {
    if (!isActive) return;
    await publish(event);
  };

  const handleSendMessage = async () => {
    const trimmed = messageInput.trim();
    if (!trimmed) return;
    await sendAction({ type: "action:speak", message: trimmed });
    toast.success(`"${trimmed}" 음성 안내를 전달했어요`);
    setMessageInput("");
  };

  const handleBack = async () => {
    if (isActive) {
      await endActive("child_closed");
    }
    navigate("/family");
  };

  // phase별 헤더 title
  const title = useMemo(() => {
    if (phase === "waiting") return "부모님 응답 기다리는 중";
    if (phase === "rejected") return "거절되었어요";
    if (phase === "ended") return "도와주기 종료";
    return `${parentName} 도와드리기`;
  }, [phase, parentName]);

  return (
    <AppShell title={title} showBack onBack={handleBack} hideBottomNav>
      {phase === "waiting" && (
        <div className="card-senior mb-4">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 size={28} className="text-green-700 animate-spin" />
            <h2 className="text-senior-heading">부모님 응답을 기다리는 중</h2>
          </div>
          <p className="text-senior-body text-gray-700">
            부모님 화면에 연결 요청이 떴어요. 수락을 기다려주세요. 45초가 지나면 자동으로 거절됩니다.
          </p>
        </div>
      )}

      {phase === "rejected" && (
        <div className="card-senior mb-4 text-center">
          <p className="text-senior-heading mb-2">부모님이 거절하셨어요</p>
          <p className="text-senior-body text-gray-600 mb-4">나중에 다시 시도해보세요.</p>
          <button onClick={() => navigate("/family")} className="btn-primary w-full">
            가족 목록으로
          </button>
        </div>
      )}

      {phase === "ended" && (
        <div className="card-senior mb-4 text-center">
          <CheckCircle2 size={64} className="text-green-600 mx-auto mb-4" aria-hidden />
          <p className="text-senior-heading mb-2">도와주기가 끝났어요</p>
          <button onClick={() => navigate("/family")} className="btn-primary w-full mt-2">
            가족 목록으로
          </button>
        </div>
      )}

      {isActive && (
        <>
          <div
            className="card-senior mb-4 flex items-center gap-3"
            style={{ background: "linear-gradient(135deg,#dcfce7,#bbf7d0)", border: "2px solid #16a34a" }}
          >
            <Radio size={28} className="text-green-700 animate-pulse" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-senior-button text-green-900 font-bold">
                {parentName}와 연결됨
              </p>
              <p className="text-sm text-green-800/80">
                {parentRoute ? `현재 화면: ${parentRoute}` : "화면 상태 수신 대기 중"}
              </p>
            </div>
          </div>

          <section className="mb-4">
            <ParentMirror
              route={parentRoute}
              queryString={parentQuery}
              player={parentPlayer}
              pointingEnabled={pointing}
              onPick={(selector, label) => {
                sendAction({ type: "action:highlight", selector, ttlMs: 5000 });
                toast.success(label ? `"${label}" 위치를 표시해드렸어요` : "위치를 표시해드렸어요");
                setPointing(false);
              }}
            />
          </section>

          <section className="card-senior mb-4">
            <div className="flex items-center gap-3 mb-3">
              <MousePointer2 size={28} className="text-amber-600" />
              <h2 className="text-senior-heading">여기 누르세요 표시</h2>
            </div>
            <p className="text-senior-body text-gray-600 mb-3">
              부모님 화면에서 눌러야 할 버튼에 반짝이는 테두리를 표시해드려요.
            </p>
            <button
              onClick={() => setPointing((v) => !v)}
              className={
                pointing
                  ? "w-full rounded-2xl p-4 border-2 border-amber-500 bg-amber-50 text-amber-900 text-senior-button"
                  : "btn-secondary w-full"
              }
              aria-pressed={pointing}
            >
              {pointing ? "지목 모드 종료" : "지목 모드 켜기"}
            </button>
          </section>

          {parentPlayer && parentPlayer.videoId && (
            <section className="card-senior mb-4">
              <div className="flex items-center gap-3 mb-3">
                <Play size={28} className="text-green-700" />
                <h2 className="text-senior-heading">재생 제어</h2>
              </div>
              <p className="text-senior-body text-gray-700 mb-2 line-clamp-2">
                {parentPlayer.title ?? "재생 중"}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                {formatSeconds(parentPlayer.currentTime)} / {formatSeconds(parentPlayer.duration)}
                {parentPlayer.isPlaying ? " · 재생 중" : " · 일시정지"}
              </p>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => sendAction({ type: "action:seek", seconds: Math.max(0, parentPlayer.currentTime - 30) })}
                  className="btn-secondary"
                  aria-label="30초 뒤로"
                >
                  <SkipBack size={24} />
                  <span className="text-sm">-30초</span>
                </button>
                {parentPlayer.isPlaying ? (
                  <button
                    onClick={() => sendAction({ type: "action:pause" })}
                    className="btn-secondary"
                    aria-label="일시정지"
                  >
                    <Pause size={24} />
                    <span className="text-sm">멈춤</span>
                  </button>
                ) : (
                  <button
                    onClick={() => sendAction({ type: "action:resume" })}
                    className="btn-secondary"
                    aria-label="재생"
                  >
                    <Play size={24} />
                    <span className="text-sm">재생</span>
                  </button>
                )}
                <button
                  onClick={() => sendAction({ type: "action:seek", seconds: parentPlayer.currentTime + 30 })}
                  className="btn-secondary"
                  aria-label="30초 앞으로"
                >
                  <SkipForward size={24} />
                  <span className="text-sm">+30초</span>
                </button>
                <button
                  onClick={() => sendAction({ type: "action:navigate", path: "/" })}
                  className="btn-secondary"
                  aria-label="플레이어 종료"
                >
                  <Home size={24} />
                  <span className="text-sm">홈</span>
                </button>
              </div>
            </section>
          )}

          <section className="card-senior mb-4">
            <h2 className="text-senior-heading mb-3">빠른 조작</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => sendAction({ type: "action:navigate", path: "/" })}
                className="tile-senior"
                aria-label="홈으로 이동"
              >
                <Home size={36} className="text-gray-800" />
                <span className="text-senior-button">홈</span>
              </button>
              <button
                onClick={() => sendAction({ type: "action:navigate", path: "/library" })}
                className="tile-senior"
                aria-label="즐겨찾기로 이동"
              >
                <BookOpen size={36} className="text-gray-800" />
                <span className="text-senior-button">즐겨찾기</span>
              </button>
            </div>
          </section>

          <section className="card-senior mb-4">
            <div className="flex items-center gap-3 mb-3">
              <Search size={28} className="text-green-700" />
              <h2 className="text-senior-heading">검색 도와드리기</h2>
            </div>
            <p className="text-senior-body text-gray-600 mb-3">
              검색어를 입력하면 부모님 앱이 해당 결과로 이동해요.
            </p>
            <SearchBox onSearch={(q) => sendAction({ type: "action:search", query: q })} />
          </section>

          <section className="card-senior mb-4">
            <div className="flex items-center gap-3 mb-3">
              <Volume2 size={28} className="text-green-700" />
              <h2 className="text-senior-heading">음성 안내</h2>
            </div>
            <p className="text-senior-body text-gray-600 mb-3">
              타이핑한 문장을 부모님 기기에서 음성으로 읽어드려요.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendMessage();
                }}
                placeholder='예: "엄마, 여기 검색 버튼 눌러보세요"'
                className="flex-1 rounded-xl border-2 border-gray-200 px-4 py-3 text-senior-body focus:border-green-500 focus:outline-none"
                aria-label="음성으로 전할 문장"
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageInput.trim()}
                className="btn-primary px-4 flex items-center gap-2"
                aria-label="음성으로 전달"
              >
                <MessageCircle size={22} />
                <span className="hidden sm:inline">전달</span>
              </button>
            </div>
          </section>

          <section className="card-senior mb-4">
            <div className="flex items-center gap-3 mb-3">
              <PhoneCall size={28} className={call.callState === "connected" ? "text-green-700" : "text-gray-600"} />
              <h2 className="text-senior-heading">음성통화</h2>
            </div>
            {call.micError && (
              <p className="text-senior-body text-red-600 mb-3">마이크를 사용할 수 없어요: {call.micError}</p>
            )}
            {call.callState === "idle" || call.callState === "ended" || call.callState === "failed" ? (
              <>
                <p className="text-senior-body text-gray-600 mb-3">
                  부모님과 실시간으로 통화하며 안내해드릴 수 있어요. 마이크 권한이 필요합니다.
                </p>
                <button
                  onClick={() => void call.startCall()}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                  aria-label="통화 시작"
                >
                  <PhoneCall size={22} />
                  <span>통화 시작</span>
                </button>
              </>
            ) : (
              <>
                <p className="text-senior-body text-gray-700 mb-3">
                  {call.callState === "requesting-mic" && "마이크 권한을 요청 중..."}
                  {call.callState === "connecting" && "연결 중..."}
                  {call.callState === "connected" && (call.hasRemoteAudio ? "통화 중 · 부모님 음성 수신" : "통화 중")}
                </p>
                {call.audioBlocked && (
                  <button
                    onClick={() => void call.resumeAudio()}
                    className="w-full mb-3 rounded-2xl p-3 border-2 border-amber-300 bg-amber-100 text-amber-900 font-bold animate-pulse"
                    aria-label="통화 소리 켜기"
                  >
                    부모님 음성이 차단됐어요 — 여기를 눌러 소리 켜기
                  </button>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={call.toggleMute}
                    className="btn-secondary flex items-center justify-center gap-2"
                    aria-pressed={call.muted}
                    aria-label={call.muted ? "마이크 켜기" : "마이크 끄기"}
                  >
                    {call.muted ? <MicOff size={24} /> : <Mic size={24} />}
                    <span>{call.muted ? "마이크 켜기" : "음소거"}</span>
                  </button>
                  <button
                    onClick={call.endCall}
                    className="flex items-center justify-center gap-2 rounded-2xl p-4 border-2 border-red-200 text-red-600 hover:bg-red-50"
                    aria-label="통화 종료"
                  >
                    <PhoneOff size={24} />
                    <span className="text-senior-button">통화 종료</span>
                  </button>
                </div>
              </>
            )}
          </section>
        </>
      )}

      <button
        onClick={handleBack}
        className="w-full flex items-center justify-center gap-2 rounded-2xl p-4 border-2 border-red-200 text-red-600 hover:bg-red-50 transition-colors"
      >
        <ArrowLeft size={22} />
        <span className="text-senior-button">
          {isActive ? "도와주기 종료" : "가족 목록으로"}
        </span>
      </button>
    </AppShell>
  );
}

function formatSeconds(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const total = Math.floor(s);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function SearchBox({ onSearch }: { onSearch: (query: string) => void }) {
  const [value, setValue] = useState("");
  const submit = () => {
    const q = value.trim();
    if (!q) return;
    onSearch(q);
    toast.success(`"${q}" 검색을 전달했어요`);
    setValue("");
  };
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder="예: 트로트, 건강 체조"
        className="flex-1 rounded-xl border-2 border-gray-200 px-4 py-3 text-senior-body focus:border-green-500 focus:outline-none"
        aria-label="검색어"
      />
      <button onClick={submit} disabled={!value.trim()} className="btn-primary px-4">
        검색
      </button>
    </div>
  );
}
