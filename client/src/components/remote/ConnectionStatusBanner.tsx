// Ably 실시간 연결이 끊겼거나 실패했을 때 사용자에게 보이는 얇은 배너.
// 활성 세션 중이거나 곧 세션에 참여해야 할 때 알려준다. 정상 상태면 렌더되지 않는다.

import { WifiOff, RefreshCw } from "lucide-react";
import { useRemoteSession } from "@/contexts/RemoteSessionContext";

export default function ConnectionStatusBanner() {
  const { ablyState, activeSession } = useRemoteSession();

  // 세션이 없고 idle이면 조용히 유지
  if (ablyState === "connected" || ablyState === "idle" || ablyState === "connecting") {
    return null;
  }
  // disconnected/failed만 표시
  const isFailed = ablyState === "failed";
  const hasSession = !!activeSession;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
      style={{
        top: hasSession && activeSession?.role === "parent" ? "calc(72px + env(safe-area-inset-top))" : "calc(12px + env(safe-area-inset-top))",
        background: isFailed ? "#b91c1c" : "#f59e0b",
        color: "#fff",
        maxWidth: "90vw",
      }}
    >
      <WifiOff size={18} aria-hidden />
      <span className="text-sm font-semibold">
        {isFailed
          ? "실시간 연결에 실패했어요. 새로고침이 필요해요"
          : hasSession
          ? "연결이 잠시 끊겼어요. 다시 연결하는 중..."
          : "실시간 서비스에 연결 중..."}
      </span>
      {isFailed && (
        <button
          onClick={() => window.location.reload()}
          className="ml-1 flex items-center gap-1 rounded-full px-2 py-1 bg-white/20 hover:bg-white/30"
          aria-label="새로고침"
        >
          <RefreshCw size={14} />
          <span className="text-xs">새로고침</span>
        </button>
      )}
    </div>
  );
}
