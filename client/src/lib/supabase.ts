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
      detectSessionInUrl: true,
      storageKey: "appatree.auth.v1",
    },
  });
  return _client;
}

export function isSupabaseConfigured(): boolean {
  return !!url && !!anonKey;
}
