// 메모리 기반 슬라이딩 윈도우 rate limit.
// Vercel serverless 인스턴스마다 분리되지만, Fluid Compute 재사용 덕에 동일 유저의
// 폭주는 대체로 한 인스턴스로 가기 쉽다. 악의적 공격 방어보다는 UI 실수 방지용.
// 영구 쿼터가 필요하면 Upstash Redis 등으로 치환할 수 있도록 key 기반 API 유지.

type Entry = { timestamps: number[] };
const buckets = new Map<string, Entry>();

export interface RateLimitOptions {
  /** 허용 횟수 */
  limit: number;
  /** 윈도우 길이 (ms) */
  windowMs: number;
}

export function checkRateLimit(key: string, opts: RateLimitOptions): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  const entry = buckets.get(key) ?? { timestamps: [] };
  // 오래된 항목 제거
  const cutoff = now - opts.windowMs;
  const fresh = entry.timestamps.filter((t) => t > cutoff);
  if (fresh.length >= opts.limit) {
    const oldest = fresh[0];
    return { ok: false, retryAfterMs: Math.max(0, oldest + opts.windowMs - now) };
  }
  fresh.push(now);
  buckets.set(key, { timestamps: fresh });
  return { ok: true };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}
