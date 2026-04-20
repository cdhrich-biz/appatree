// 원격 지원 페이지 공통 로그인 가드.
// Supabase Auth 세션이 없으면 시니어 친화 "로그인이 필요해요" 화면을 렌더한다.
// 버튼 클릭 시 /login 으로 이동해 카카오 로그인 플로우를 시작한다.

import { Loader2, LogIn, UserRound } from "lucide-react";
import { type ReactNode } from "react";
import { useLocation } from "wouter";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";

interface RequireAuthProps {
  title?: string;
  children: ReactNode;
}

export default function RequireAuth({ title = "로그인이 필요해요", children }: RequireAuthProps) {
  const [, navigate] = useLocation();
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <AppShell title={title} showBack>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Loader2 size={48} className="text-gray-400 animate-spin mb-4" aria-hidden />
          <p className="text-senior-body text-gray-500">잠시만 기다려주세요...</p>
        </div>
      </AppShell>
    );
  }

  if (session) return <>{children}</>;

  return (
    <AppShell title={title} showBack>
      <div className="card-senior mb-4 text-center">
        <div className="flex justify-center mb-4">
          <span
            className="flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-700"
            aria-hidden
          >
            <UserRound size={40} />
          </span>
        </div>
        <h2 className="text-senior-heading mb-2">로그인이 필요해요</h2>
        <p className="text-senior-body text-gray-700 mb-6">
          가족과 연결하려면 먼저 로그인이 필요합니다.<br />
          카카오톡으로 간단하게 시작할 수 있어요.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="btn-primary w-full flex items-center justify-center gap-2"
          aria-label="로그인 화면으로 이동"
        >
          <LogIn size={22} />
          <span>로그인 화면으로 이동</span>
        </button>
      </div>
    </AppShell>
  );
}
