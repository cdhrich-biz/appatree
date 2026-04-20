// 부모 기기에서 자녀의 지원 요청이 도착했을 때 전역으로 표시되는 다이얼로그.
// 시니어가 알아차리기 쉬도록 풀스크린 오버레이 + 큰 버튼 + 자동 TTS.

import { useEffect, useMemo, useState } from "react";
import { UserRound, Check, X } from "lucide-react";
import { useRemoteSession } from "@/contexts/RemoteSessionContext";

const AUTO_REJECT_MS = 45 * 1000;

export default function IncomingSessionDialog() {
  const { pendingRequest, acceptIncoming, rejectIncoming } = useRemoteSession();
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!pendingRequest) return;
    setBusy(false);
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [pendingRequest]);

  const remainingSec = useMemo(() => {
    if (!pendingRequest) return 0;
    const elapsed = now - pendingRequest.requestedAt;
    return Math.max(0, Math.ceil((AUTO_REJECT_MS - elapsed) / 1000));
  }, [pendingRequest, now]);

  if (!pendingRequest) return null;

  const handleAccept = async () => {
    if (busy) return;
    setBusy(true);
    await acceptIncoming(pendingRequest.sessionKey);
  };

  const handleReject = async () => {
    if (busy) return;
    setBusy(true);
    await rejectIncoming(pendingRequest.sessionKey);
  };

  const name = pendingRequest.childName ?? "자녀";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="incoming-session-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15, 23, 42, 0.72)" }}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white shadow-2xl p-6 text-center"
        style={{ border: "3px solid #16a34a" }}
      >
        <div className="flex justify-center mb-4">
          <span
            className="flex items-center justify-center w-24 h-24 rounded-full bg-green-100 text-green-700"
            aria-hidden
          >
            <UserRound size={56} />
          </span>
        </div>

        <h2 id="incoming-session-title" className="text-senior-title font-bold mb-2">
          {name}가 도와주려고 해요
        </h2>
        <p className="text-senior-body text-gray-700 mb-6">
          수락하면 {name}가 화면을 함께 보면서 도와드릴 수 있어요.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleAccept}
            disabled={busy}
            className="flex flex-col items-center justify-center rounded-2xl p-5 transition-colors disabled:opacity-50"
            style={{ background: "#16a34a", color: "#fff", minHeight: 120 }}
            aria-label="수락"
          >
            <Check size={40} strokeWidth={3} aria-hidden />
            <span className="text-senior-button mt-2 font-bold">수락</span>
          </button>
          <button
            onClick={handleReject}
            disabled={busy}
            className="flex flex-col items-center justify-center rounded-2xl p-5 transition-colors disabled:opacity-50"
            style={{ background: "#f1f5f9", color: "#111", minHeight: 120, border: "2px solid #e2e8f0" }}
            aria-label="거절"
          >
            <X size={40} strokeWidth={3} aria-hidden />
            <span className="text-senior-button mt-2 font-bold">거절</span>
          </button>
        </div>

        <p className="text-sm text-gray-500 mt-5" aria-live="polite">
          {remainingSec > 0
            ? `${remainingSec}초 뒤에 자동으로 거절돼요`
            : "요청이 만료되었어요"}
        </p>
      </div>
    </div>
  );
}
