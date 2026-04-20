// 원격 지원 페이지 공통 로그인 가드.
// Manus OAuth 세션이 없으면 "로그인이 필요해요" 시니어 친화 화면을 렌더한다.
// 로그인 상태를 판정할 때 RemoteSessionContext의 meQuery 결과(=myUserId)를 재사용한다.

import { LogIn, UserRound } from "lucide-react";
import { type ReactNode } from "react";
import AppShell from "@/components/AppShell";
import { getLoginUrl } from "@/const";
import { useRemoteSession } from "@/contexts/RemoteSessionContext";

interface RequireAuthProps {
  title?: string;
  children: ReactNode;
}

export default function RequireAuth({ title = "로그인이 필요해요", children }: RequireAuthProps) {
  const { myUserId } = useRemoteSession();

  if (myUserId) return <>{children}</>;

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
          아래 버튼을 누르면 로그인 화면으로 이동해요.
        </p>
        <button
          onClick={() => {
            window.location.href = getLoginUrl();
          }}
          className="btn-primary w-full flex items-center justify-center gap-2"
          aria-label="로그인하기"
        >
          <LogIn size={22} />
          <span>로그인하기</span>
        </button>
      </div>
    </AppShell>
  );
}
