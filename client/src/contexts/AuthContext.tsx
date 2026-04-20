// Supabase Auth 세션 전역 상태.
// - 카카오 OAuth 로그인/로그아웃
// - 세션 자동 갱신 (Supabase SDK가 토큰 만료 전 refresh 수행)
// - trpc 요청 헤더에 access_token을 주입하기 위해 현재 세션을 외부에서 조회할 수 있는 getter 노출

import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

export interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  /** 카카오 로그인 시작 — Supabase가 카톡으로 리다이렉트한 뒤 /auth/callback으로 복귀 */
  signInWithKakao: () => Promise<void>;
  signOut: () => Promise<void>;
  configured: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// tRPC 헤더 주입용 전역 세션 참조 (React 컴포넌트 밖에서도 읽을 수 있어야 함)
let currentAccessToken: string | null = null;
export function getCurrentAccessToken(): string | null {
  return currentAccessToken;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(configured);

  useEffect(() => {
    if (!configured) {
      setIsLoading(false);
      return;
    }
    const supabase = getSupabase();
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      currentAccessToken = data.session?.access_token ?? null;
      setIsLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      currentAccessToken = nextSession?.access_token ?? null;
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [configured]);

  const signInWithKakao = useCallback(async () => {
    if (!configured) throw new Error("Supabase 환경변수가 설정되지 않았어요");
    const supabase = getSupabase();
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo,
        scopes: "profile_nickname profile_image account_email",
      },
    });
    if (error) throw error;
  }, [configured]);

  const signOut = useCallback(async () => {
    if (!configured) return;
    const supabase = getSupabase();
    await supabase.auth.signOut();
    currentAccessToken = null;
  }, [configured]);

  const value = useMemo<AuthContextValue>(
    () => ({ session, isLoading, signInWithKakao, signOut, configured }),
    [session, isLoading, signInWithKakao, signOut, configured],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
