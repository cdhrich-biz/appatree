// 부모 기기에서 활성 세션 중일 때 상단 고정 표시되는 배너.
// 세션 종료 + 음성통화 토글(수신/음소거)까지 여기서 제공한다.

import { Radio, X, PhoneCall, PhoneOff, Mic, MicOff, Volume2 } from "lucide-react";
import { useRemoteSession } from "@/contexts/RemoteSessionContext";
import { useWebRTC } from "@/hooks/useWebRTC";

export default function ActiveSessionBanner() {
  const { activeSession, endActive } = useRemoteSession();
  const call = useWebRTC();

  if (!activeSession || activeSession.role !== "parent") return null;

  const name = activeSession.counterpartName ?? "자녀";

  const callLabel = (() => {
    switch (call.callState) {
      case "idle":
      case "ended":
      case "failed":
        return "통화 받기";
      case "incoming":
        return "통화 받기";
      case "requesting-mic":
        return "마이크 허용 중";
      case "connecting":
        return "연결 중";
      case "connected":
        return call.muted ? "마이크 꺼짐" : "통화 중";
      default:
        return "통화";
    }
  })();

  const isActiveCall = call.callState === "connected";
  const isIncoming = call.callState === "incoming";

  return (
    <div
      role="region"
      aria-label="원격 도움 진행 중"
      className="fixed top-0 left-0 right-0 z-40"
      style={{
        background: "linear-gradient(135deg, #16a34a, #15803d)",
        color: "#fff",
        boxShadow: "0 6px 20px rgba(22, 163, 74, 0.35)",
      }}
    >
      <div className="max-w-2xl mx-auto flex items-center gap-2 px-3 py-3">
        <span
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 animate-pulse"
          aria-hidden
        >
          <Radio size={22} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-senior-button font-bold truncate">{name}가 도와주는 중</p>
          <p className="text-sm opacity-90 truncate">
            {isIncoming
              ? `${name}가 통화를 요청했어요`
              : isActiveCall
              ? "통화 연결됨 · 말씀하세요"
              : "언제든 오른쪽 종료를 누르세요"}
          </p>
        </div>

        {/* autoplay 차단 복구 */}
        {call.audioBlocked && (
          <button
            onClick={() => void call.resumeAudio()}
            className="flex items-center gap-1 rounded-xl px-3 py-2 bg-amber-400 text-amber-950 font-bold animate-pulse"
            aria-label="통화 소리 켜기"
            title="통화 소리 켜기"
          >
            <Volume2 size={20} />
            <span className="text-sm">소리 켜기</span>
          </button>
        )}

        {/* 통화 제어 */}
        {isActiveCall ? (
          <button
            onClick={call.toggleMute}
            className="flex items-center gap-1 rounded-xl px-3 py-2 bg-white/20 hover:bg-white/30 text-white font-bold"
            aria-pressed={call.muted}
            aria-label={call.muted ? "마이크 켜기" : "음소거"}
            title={call.muted ? "마이크 켜기" : "음소거"}
          >
            {call.muted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>
        ) : (
          <button
            onClick={() => void call.startCall()}
            className="flex items-center gap-1 rounded-xl px-3 py-2 bg-white text-green-800 font-bold"
            aria-label={callLabel}
            title={callLabel}
          >
            <PhoneCall size={20} />
          </button>
        )}

        {isActiveCall && (
          <button
            onClick={call.endCall}
            className="flex items-center gap-1 rounded-xl px-3 py-2 bg-red-500 text-white font-bold"
            aria-label="통화 종료"
            title="통화 종료"
          >
            <PhoneOff size={20} />
          </button>
        )}

        <button
          onClick={() => endActive("parent_closed")}
          className="flex items-center gap-1 rounded-xl px-3 py-2 bg-white text-green-800 font-bold text-senior-button transition-colors hover:bg-green-50"
          aria-label="도와주기 종료"
        >
          <X size={20} strokeWidth={3} />
          <span>종료</span>
        </button>
      </div>
    </div>
  );
}
