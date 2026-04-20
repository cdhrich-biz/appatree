import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { authenticateSupabaseRequest } from "./supabaseAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // 1) Supabase Access Token (Authorization: Bearer ... 또는 app_supabase_session 쿠키) — 카카오 로그인 경로
  try {
    user = await authenticateSupabaseRequest(opts.req);
  } catch (error) {
    user = null;
  }

  // 2) Manus OAuth 세션 쿠키 — 레거시 로그인 경로
  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
