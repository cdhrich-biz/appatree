// 서버 측 Supabase Auth 연동.
// - 요청의 Authorization: Bearer <access_token> 또는 앱이 세팅한 app_access_token 쿠키를 검증
// - 검증 통과하면 Supabase user.id/email/카카오 메타데이터를 기반으로 내부 users 테이블에 upsert
// - 반환: 내부 users 테이블의 행

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Request } from "express";
import { eq } from "drizzle-orm";
import { users, type User } from "../../drizzle/schema";
import { getDb, upsertUser } from "../db";
import { ENV } from "./env";

let _admin: SupabaseClient | null = null;

function getAdmin(): SupabaseClient | null {
  if (_admin) return _admin;
  if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) return null;
  _admin = createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return _admin;
}

export const SUPABASE_COOKIE_NAME = "app_supabase_session";

function readCookie(req: Request, name: string): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

function extractAccessToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();
    if (token) return token;
  }
  const cookieToken = readCookie(req, SUPABASE_COOKIE_NAME);
  if (cookieToken) return cookieToken;
  return null;
}

export async function authenticateSupabaseRequest(req: Request): Promise<User | null> {
  const token = extractAccessToken(req);
  if (!token) return null;
  const admin = getAdmin();
  if (!admin) return null;

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;

  const authUser = data.user;
  const openId = `supabase:${authUser.id}`;
  const providerFromApp = (authUser.app_metadata?.provider as string | undefined) ?? null;
  const nickname =
    (authUser.user_metadata?.nickname as string | undefined) ||
    (authUser.user_metadata?.full_name as string | undefined) ||
    (authUser.user_metadata?.name as string | undefined) ||
    authUser.email?.split("@")[0] ||
    null;

  await upsertUser({
    openId,
    name: nickname,
    email: authUser.email ?? null,
    loginMethod: providerFromApp ?? "kakao",
    lastSignedIn: new Date(),
  });

  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return rows[0] ?? null;
}
