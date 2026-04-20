import { useEffect, useState } from "react";
import { MessageCircle, ShieldCheck, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/contexts/PreferencesContext";

export default function Login() {
  const [, navigate] = useLocation();
  const { session, signInWithKakao, isLoading } = useAuth();
  const { speak } = usePreferences();
  const [busy, setBusy] = useState(false);

  // 이미 로그인된 사용자는 홈으로
  useEffect(() => {
    if (!isLoading && session) {
      navigate("/");
    }
  }, [session, isLoading, navigate]);

  // 최초 진입 시 한 번 TTS 안내
  useEffect(() => {
    if (isLoading) return;
    try {
      speak("처음 사용하시나요? 노란색 카카오톡 버튼을 눌러 시작하세요.");
    } catch {
      // noop
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const handleKakao = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await signInWithKakao();
      // 리다이렉트가 일어나므로 여기 이후 코드는 실행되지 않는 것이 정상
    } catch (err) {
      setBusy(false);
      const msg = err instanceof Error ? err.message : "로그인 준비 중 문제가 생겼어요";
      toast.error(msg);
    }
  };

  return (
    <AppShell title="시작하기" hideBottomNav>
      <div className="flex flex-col items-center py-6">
        <div
          className="flex items-center justify-center w-28 h-28 rounded-3xl mb-6"
          style={{ background: "linear-gradient(135deg,#16a34a,#15803d)", boxShadow: "var(--shadow-voice)" }}
          aria-hidden
        >
          <span className="text-6xl">🎧</span>
        </div>
        <h1 className="text-senior-title font-bold mb-2 text-center">아빠트리에 오신 걸 환영해요</h1>
        <p className="text-senior-body text-gray-600 mb-8 text-center">
          책을 귀로 듣고, 가족과 함께 즐겨요.
        </p>

        {/* 메인 로그인 카드 */}
        <div className="card-senior w-full mb-4">
          <h2 className="text-senior-heading mb-4 text-center">카카오톡으로 시작하기</h2>
          <button
            onClick={handleKakao}
            disabled={busy}
            aria-label="카카오톡 계정으로 시작하기"
            className="w-full flex items-center justify-center gap-3 rounded-2xl p-5 font-bold transition-colors disabled:opacity-60"
            style={{
              background: "#FEE500",
              color: "#191919",
              minHeight: 92,
              fontSize: "var(--text-senior-button)",
              border: "2px solid #FEE500",
            }}
          >
            <MessageCircle size={32} strokeWidth={2.4} fill="#191919" className="text-[#FEE500]" />
            <span>{busy ? "잠시만요..." : "카카오톡으로 시작하기"}</span>
          </button>
          <p className="text-senior-body text-gray-600 mt-4 text-center">
            카카오톡 앱이 열리면 <strong className="text-gray-900">"동의하고 계속하기"</strong>를 눌러주세요.
          </p>
        </div>

        {/* 안심 메시지 — 시니어가 개인정보 걱정을 덜도록 */}
        <div className="card-senior w-full mb-4">
          <div className="flex items-start gap-3">
            <ShieldCheck size={32} className="text-green-700 flex-shrink-0 mt-1" aria-hidden />
            <div>
              <p className="text-senior-button font-bold mb-1">안심하고 사용하세요</p>
              <ul className="text-senior-body text-gray-700 space-y-1 list-disc list-inside">
                <li>카카오톡 로그인만 사용해요 — 비밀번호를 기억하실 필요가 없어요</li>
                <li>아빠트리는 카카오톡 메시지를 보지 않아요</li>
                <li>자녀와 연결해야만 원격으로 도움을 받을 수 있어요</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 안내 음성 다시 듣기 */}
        <button
          onClick={() =>
            speak(
              "카카오톡으로 시작하는 노란색 버튼을 눌러주세요. 카카오톡이 열리면, 동의하고 계속하기를 누르시면 돼요.",
            )
          }
          className="w-full flex items-center justify-center gap-2 rounded-2xl p-3 border-2 border-gray-200 bg-white"
          aria-label="안내 음성 다시 듣기"
        >
          <Volume2 size={22} className="text-gray-700" />
          <span className="text-senior-button text-gray-700">안내 음성 다시 듣기</span>
        </button>
      </div>
    </AppShell>
  );
}
