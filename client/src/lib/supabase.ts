// Supabase 브라우저 클라이언트 singleton.
// - 카카오 소셜 로그인 전용 (PKCE flow)
// - 세션은 localStorage 자동 관리
// - 토큰 만료 시 자동 갱신

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function assertConfigured() {
  if (!url || !anonKey) {
    throw new Error(
      "VITE_SUPABASE_URL 또는 VITE_SUPABASE_ANON_KEY 환경변수가 설정되지 않았어요. .env.local 및 Vercel 대시보드를 확인해주세요.",
    );
  }
}

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  assertConfigured();
  _client = createClient(url!, anonKey!, {
    auth: {
      flowType: "pkce",
      autoRefreshToken: true,
      persistSession: true,
      // detectSessionInUrl: 암묵적 교환은 실패를 조용히 삼켜서
      // 콜백 페이지가 무한 로딩에 빠진다. AuthCallback에서 명시적으로
      // exchangeCodeForSession을 호출해 에러를 사용자에게 보여준다.
      detectSessionInUrl: false,
      storageKey: "appatree.auth.v1",
    },
  });
  return _client;
}

export function isSupabaseConfigured(): boolean {
  return !!url && !!anonKey;
}
