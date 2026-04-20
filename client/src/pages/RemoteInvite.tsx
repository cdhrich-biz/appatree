import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Volume2, UserPlus, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import { trpc } from "@/lib/trpc";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useRemoteSession } from "@/contexts/RemoteSessionContext";
import RequireAuth from "@/components/remote/RequireAuth";

// 6자리 코드를 "123-456"처럼 하이픈으로 나눠서 크게 표시
function formatCode(code: string): string {
  if (!code || code.length !== 6) return code;
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

function formatRemaining(expiresAt: Date): string {
  const now = Date.now();
  const remainingMs = Math.max(0, expiresAt.getTime() - now);
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function speakCodeDigits(code: string, speak: (m: string) => void) {
  const spoken = code.split("").join(" ");
  speak(`초대 번호는 ${spoken} 입니다. 자녀에게 말씀해주세요.`);
}

export default function RemoteInvite() {
  return (
    <RequireAuth title="자녀에게 도움 요청">
      <RemoteInviteContent />
    </RequireAuth>
  );
}

function RemoteInviteContent() {
  const { speak } = usePreferences();
  const { myUserId } = useRemoteSession();
  const inviteMutation = trpc.remote.createInvite.useMutation();
  const [invite, setInvite] = useState<{ code: string; expiresAt: Date } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [hasAnnounced, setHasAnnounced] = useState(false);

  // 페이지 진입 시 코드 자동 발행 (로그인 확정 후)
  useEffect(() => {
    if (!myUserId) return;
    let cancelled = false;
    inviteMutation
      .mutateAsync()
      .then((row) => {
        if (cancelled || !row) return;
        setInvite({ code: row.code, expiresAt: new Date(row.expiresAt) });
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "초대 코드 발급에 실패했어요";
        toast.error(msg);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUserId]);

  // 1초마다 만료 카운트다운 갱신
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // 코드를 처음 받았을 때 자동 TTS 안내 (한 번만)
  useEffect(() => {
    if (invite && !hasAnnounced) {
      setHasAnnounced(true);
      speak("여섯 자리 숫자가 보이시나요? 자녀에게 이 숫자를 말씀해주세요.");
    }
  }, [invite, hasAnnounced, speak]);

  const expired = useMemo(() => {
    if (!invite) return false;
    return invite.expiresAt.getTime() <= now;
  }, [invite, now]);

  const remaining = invite ? formatRemaining(invite.expiresAt) : "";

  const handleRegenerate = async () => {
    try {
      const row = await inviteMutation.mutateAsync();
      if (!row) return;
      setInvite({ code: row.code, expiresAt: new Date(row.expiresAt) });
      setHasAnnounced(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "코드 재발급에 실패했어요";
      toast.error(msg);
    }
  };

  const handleSpeakCode = () => {
    if (!invite) return;
    speakCodeDigits(invite.code, speak);
  };

  return (
    <AppShell title="자녀에게 도움 요청" showBack>
      <div className="card-senior mb-6">
        <div className="flex items-center gap-3 mb-4">
          <UserPlus size={28} className="text-green-700" />
          <h2 className="text-senior-heading">초대 번호</h2>
        </div>

        <p className="text-senior-body text-gray-700 mb-6">
          아래 여섯 자리 숫자를 자녀에게 알려주세요. 자녀가 이 숫자를 앱에 입력하면 연결이 완료돼요.
        </p>

        <div
          className="rounded-3xl py-8 text-center mb-6"
          style={{ background: "linear-gradient(135deg,#ecfdf5,#dcfce7)" }}
          aria-live="polite"
        >
          {inviteMutation.isPending && !invite ? (
            <p className="text-senior-heading text-gray-500">번호를 만들고 있어요...</p>
          ) : invite ? (
            <p
              className="font-bold text-green-800 tracking-widest select-all"
              style={{ fontSize: "clamp(48px, 14vw, 96px)", lineHeight: 1.05 }}
              aria-label={`초대 번호 ${invite.code.split("").join(" ")}`}
            >
              {formatCode(invite.code)}
            </p>
          ) : (
            <p className="text-senior-heading text-red-600">번호를 만들지 못했어요</p>
          )}

          {invite && !expired && (
            <p className="text-senior-body text-gray-600 mt-3">
              남은 시간 <span className="font-bold">{remaining}</span>
            </p>
          )}
          {expired && (
            <p className="text-senior-body text-red-600 mt-3 font-semibold">
              번호가 만료되었어요
            </p>
          )}
        </div>

        <button
          onClick={handleSpeakCode}
          disabled={!invite}
          className="w-full flex items-center justify-center gap-3 rounded-2xl p-4 mb-3 border-2 border-green-300 bg-green-50 transition-colors hover:bg-green-100 disabled:opacity-50"
          aria-label="초대 번호 음성으로 듣기"
        >
          <Volume2 size={28} className="text-green-700" />
          <span className="text-senior-button text-green-800">음성으로 읽어주기</span>
        </button>

        <button
          onClick={handleRegenerate}
          disabled={inviteMutation.isPending}
          className="w-full flex items-center justify-center gap-3 rounded-2xl p-4 border-2 border-gray-200 bg-white transition-colors hover:bg-gray-50 disabled:opacity-50"
          aria-label="초대 번호 다시 만들기"
        >
          <RefreshCw size={24} className={inviteMutation.isPending ? "animate-spin" : ""} />
          <span className="text-senior-button">
            {inviteMutation.isPending ? "만드는 중..." : "다시 만들기"}
          </span>
        </button>
      </div>

      <div className="card-senior">
        <h3 className="text-senior-button mb-3">이렇게 하세요</h3>
        <ol className="space-y-2 text-senior-body text-gray-700 list-decimal list-inside">
          <li>자녀에게 전화를 걸어요</li>
          <li>위 여섯 자리 숫자를 또박또박 말해줘요</li>
          <li>자녀가 숫자를 앱에 입력해요</li>
          <li>연결이 완료되면 언제든 도움을 받을 수 있어요</li>
        </ol>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 text-senior-body text-gray-500">
        <span>연결이 끝나면 자녀가 언제든 도와줄 수 있어요</span>
        <ArrowRight size={18} />
      </div>
    </AppShell>
  );
}
