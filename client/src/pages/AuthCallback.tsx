// 카카오 OAuth 콜백 페이지.
// Supabase SDK가 detectSessionInUrl: true + PKCE로 URL의 code를 세션과 교환한다.
// 우리는 세션이 확정되면 홈으로 이동하고 에러면 로그인 페이지로 돌려보낸다.

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthCallback() {
  const [, navigate] = useLocation();
  const { session, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error_description") || params.get("error");
    if (error) {
      navigate(`/login?error=${encodeURIComponent(error)}`);
      return;
    }
    if (session) {
      navigate("/");
    }
  }, [session, isLoading, navigate]);

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
