// 카카오 OAuth 콜백 페이지.
// Supabase PKCE flow: URL의 code를 명시적으로 세션과 교환한다.
// detectSessionInUrl: false 이므로 여기가 유일한 교환 지점이다.

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

const EXCHANGE_TIMEOUT_MS = 10_000;

export default function AuthCallback() {
  const [, navigate] = useLocation();
  const { session } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (session) {
      navigate("/");
      return;
    }

    if (startedRef.current) return;
    startedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const providerError = params.get("error_description") || params.get("error");
    if (providerError) {
      navigate(`/login?error=${encodeURIComponent(providerError)}`);
      return;
    }

    const code = params.get("code");
    if (!code) {
      navigate("/login?error=missing_code");
      return;
    }

    if (!isSupabaseConfigured()) {
      setErrorMsg("Supabase 환경변수가 설정되지 않았어요");
      return;
    }

    let finished = false;
    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      setErrorMsg("로그인 서버 응답이 지연되고 있어요. 다시 시도해주세요.");
    }, EXCHANGE_TIMEOUT_MS);

    getSupabase()
      .auth.exchangeCodeForSession(code)
      .then(({ data, error }) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        if (error) {
          setErrorMsg(error.message || "로그인에 실패했어요");
          return;
        }
        if (data?.session) {
          navigate("/");
          return;
        }
        setErrorMsg("세션을 받지 못했어요. 다시 시도해주세요.");
      })
      .catch((err: unknown) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        const msg = err instanceof Error ? err.message : "알 수 없는 오류가 발생했어요";
        setErrorMsg(msg);
      });

    return () => {
      finished = true;
      clearTimeout(timer);
    };
  }, [session, navigate]);

  if (errorMsg) {
    return (
      <AppShell title="로그인 실패" hideBottomNav>
        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
          <AlertCircle size={64} className="text-red-600 mb-5" aria-hidden />
          <p className="text-senior-heading mb-2">로그인을 완료하지 못했어요</p>
          <p className="text-senior-body text-gray-700 mb-8 break-words">{errorMsg}</p>
          <button
            onClick={() => navigate("/login")}
            className="w-full max-w-sm rounded-2xl p-5 bg-green-700 text-white font-bold"
            style={{ minHeight: 72, fontSize: "var(--text-senior-button)" }}
          >
            로그인 화면으로 돌아가기
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="로그인 완료 중" hideBottomNav>
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Loader2 size={64} className="text-green-600 animate-spin mb-5" aria-hidden />
        <p className="text-senior-heading mb-2">로그인을 마무리하고 있어요</p>
        <p className="text-senior-body text-gray-600">잠시만 기다려주세요.</p>
      </div>
    </AppShell>
  );
}
