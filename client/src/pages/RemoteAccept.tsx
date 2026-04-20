import { useEffect, useRef, useState } from "react";
import { CheckCircle2, KeyRound } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import { trpc } from "@/lib/trpc";
import RequireAuth from "@/components/remote/RequireAuth";

export default function RemoteAccept() {
  return (
    <RequireAuth title="부모님 연결">
      <RemoteAcceptContent />
    </RequireAuth>
  );
}

function RemoteAcceptContent() {
  const [, navigate] = useLocation();
  const [code, setCode] = useState("");
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const utils = trpc.useUtils();

  const acceptMutation = trpc.remote.acceptInvite.useMutation({
    onSuccess: async () => {
      await utils.remote.listRelations.invalidate();
      setSuccess(true);
      setTimeout(() => navigate("/family"), 1500);
    },
    onError: (err) => {
      toast.error(err.message || "코드를 확인해주세요");
      setCode("");
      inputRef.current?.focus();
    },
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 6자리 도달 시 자동 제출
  useEffect(() => {
    if (code.length === 6 && !acceptMutation.isPending && !success) {
      acceptMutation.mutate({ code });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 6) acceptMutation.mutate({ code });
  };

  if (success) {
    return (
      <AppShell title="연결 완료" showBack hideBottomNav>
        <div className="flex flex-col items-center text-center mt-12">
          <CheckCircle2 size={96} className="text-green-600 mb-6" aria-hidden />
          <h2 className="text-senior-title font-bold mb-3">연결되었어요</h2>
          <p className="text-senior-body text-gray-600 mb-8">
            이제 가족 화면에서 도움을 드릴 수 있어요.
          </p>
          <div className="w-20 h-1 bg-green-600 rounded-full animate-pulse" aria-hidden />
        </div>
      </AppShell>
    );
  }

  const slots = Array.from({ length: 6 }, (_, i) => code[i] ?? "");

  return (
    <AppShell title="부모님 연결" showBack>
      <div className="card-senior mb-6">
        <div className="flex items-center gap-3 mb-4">
          <KeyRound size={28} className="text-green-700" />
          <h2 className="text-senior-heading">초대 번호 입력</h2>
        </div>

        <p className="text-senior-body text-gray-700 mb-6">
          부모님이 알려주신 <span className="font-bold">여섯 자리</span> 초대 번호를 입력해주세요.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <label className="sr-only" htmlFor="invite-code">
            초대 번호 여섯 자리
          </label>
          <input
            ref={inputRef}
            id="invite-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            value={code}
            onChange={(e) => handleChange(e.target.value)}
            disabled={acceptMutation.isPending}
            aria-label="초대 번호 여섯 자리"
            className="sr-only"
          />

          <div
            role="group"
            aria-label="입력된 초대 번호 표시"
            className="grid grid-cols-6 gap-2 select-none"
            onClick={() => inputRef.current?.focus()}
          >
            {slots.map((digit, idx) => (
              <div
                key={idx}
                className={`rounded-2xl border-2 flex items-center justify-center font-bold transition-colors ${
                  digit
                    ? "border-green-500 bg-green-50 text-green-800"
                    : "border-gray-200 bg-white text-gray-300"
                }`}
                style={{ aspectRatio: "3 / 4", fontSize: "clamp(32px, 9vw, 56px)" }}
                aria-hidden
              >
                {digit || "·"}
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={code.length !== 6 || acceptMutation.isPending}
            className="btn-primary w-full"
          >
            {acceptMutation.isPending ? "확인 중..." : "연결하기"}
          </button>
        </form>
      </div>

      <div className="card-senior">
        <h3 className="text-senior-button mb-3">안내</h3>
        <ul className="space-y-2 text-senior-body text-gray-700 list-disc list-inside">
          <li>부모님이 앱의 "도움 요청"에서 번호를 만들어주세요</li>
          <li>번호는 만든 시점부터 10분 동안 사용할 수 있어요</li>
          <li>연결되면 부모님의 허락을 받을 때마다 원격으로 도와드릴 수 있어요</li>
        </ul>
      </div>
    </AppShell>
  );
}
