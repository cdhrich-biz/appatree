import { eq, or } from "drizzle-orm";
import { appConfig, searchLogs } from "../../drizzle/schema";
import { getDb } from "../db";
import { ENV } from "./env";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

// ─── In-memory cache (5-minute TTL) ─────────────────────────────────────────
interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Rate limiter (per-user, 20 searches/hour) ──────────────────────────────
const rateLimits = new Map<number, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 20;

export function checkRateLimit(userId: number): boolean {
  const now = Date.now();
  const timestamps = rateLimits.get(userId) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  rateLimits.set(userId, recent);
  if (recent.length >= RATE_LIMIT_MAX) return false;
  recent.push(now);
  return true;
}

// ─── Config helpers ──────────────────────────────────────────────────────────
async function getYouTubeConfig() {
  const db = await getDb();
  if (!db) {
    return { safeSearch: "strict", relevanceLanguage: "ko", audiobookSuffix: "오디오북", defaultMaxResults: 10, blockedChannels: [] as string[], blockedKeywords: [] as string[] };
  }
  const configs = await db
    .select({ configKey: appConfig.configKey, configValue: appConfig.configValue })
    .from(appConfig)
    .where(
      or(
        eq(appConfig.configKey, "youtube.safeSearch"),
        eq(appConfig.configKey, "youtube.relevanceLanguage"),
        eq(appConfig.configKey, "youtube.audiobookSuffix"),
        eq(appConfig.configKey, "youtube.defaultMaxResults"),
        eq(appConfig.configKey, "youtube.blockedChannels"),
        eq(appConfig.configKey, "youtube.blockedKeywords")
      )
    );
  const m = new Map(configs.map((c) => [c.configKey, c.configValue]));

  let blockedChannels: string[] = [];
  let blockedKeywords: string[] = [];
  try { blockedChannels = JSON.parse(m.get("youtube.blockedChannels") ?? "[]"); } catch { /* ignore */ }
  try { blockedKeywords = JSON.parse(m.get("youtube.blockedKeywords") ?? "[]"); } catch { /* ignore */ }

  return {
    safeSearch: m.get("youtube.safeSearch") ?? "strict",
    relevanceLanguage: m.get("youtube.relevanceLanguage") ?? "ko",
    audiobookSuffix: m.get("youtube.audiobookSuffix") ?? "오디오북",
    defaultMaxResults: parseInt(m.get("youtube.defaultMaxResults") ?? "10", 10),
    blockedChannels,
    blockedKeywords,
  };
}

// ─── Core API call ───────────────────────────────────────────────────────────
async function youtubeGet<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${YOUTUBE_API_BASE}/${endpoint}`);
  url.searchParams.set("key", ENV.youtubeApiKey);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`YouTube API error (${res.status}): ${error}`);
  }
  return res.json() as Promise<T>;
}

// ─── Filter results ──────────────────────────────────────────────────────────
function filterResults(items: Array<Record<string, unknown>>, blockedChannels: string[], blockedKeywords: string[]): Array<Record<string, unknown>> {
  if (blockedChannels.length === 0 && blockedKeywords.length === 0) return items;

  const blockedChannelSet = new Set(blockedChannels.map((c) => c.toLowerCase()));
  const lowerKeywords = blockedKeywords.map((k) => k.toLowerCase());

  return items.filter((item) => {
    const snippet = item.snippet as Record<string, unknown> | undefined;
    if (!snippet) return true;

    const channelId = (snippet.channelId as string ?? "").toLowerCase();
    const channelTitle = (snippet.channelTitle as string ?? "").toLowerCase();
    if (blockedChannelSet.has(channelId) || blockedChannelSet.has(channelTitle)) return false;

    const title = (snippet.title as string ?? "").toLowerCase();
    const description = (snippet.description as string ?? "").toLowerCase();
    for (const keyword of lowerKeywords) {
      if (title.includes(keyword) || description.includes(keyword)) return false;
    }
    return true;
  });
}

// ─── Search logging ──────────────────────────────────────────────────────────
async function logSearch(query: string, resultCount: number, userId?: number, source: "text" | "voice" | "category" = "text") {
  const db = await getDb();
  if (!db) return;
  await db.insert(searchLogs).values({ userId: userId ?? null, query, resultCount, source }).catch(() => {});
}

// ─── Public API ──────────────────────────────────────────────────────────────
export async function searchVideos(
  query: string,
  maxResults?: number,
  userId?: number,
  source?: "text" | "voice" | "category",
  order?: string,
  pageToken?: string,
) {
  const config = await getYouTubeConfig();
  const fullQuery = `${query} ${config.audiobookSuffix}`.trim();
  const max = maxResults ?? config.defaultMaxResults;
  const orderVal = order ?? "relevance";
  const cacheKey = `search:${fullQuery}:${max}:${config.safeSearch}:${orderVal}:${pageToken ?? ""}`;

  const cached = getCached<unknown>(cacheKey);
  if (cached) return cached;

  const params: Record<string, string> = {
    part: "snippet",
    q: fullQuery,
    type: "video",
    maxResults: String(max),
    safeSearch: config.safeSearch,
    relevanceLanguage: config.relevanceLanguage,
    videoDuration: "long",
    videoEmbeddable: "true",
    order: orderVal,
  };
  if (pageToken) params.pageToken = pageToken;

  const result = await youtubeGet<Record<string, unknown>>("search", params);

  // Filter blocked content
  if (Array.isArray(result.items)) {
    result.items = filterResults(result.items as Array<Record<string, unknown>>, config.blockedChannels, config.blockedKeywords);
  }

  setCache(cacheKey, result);
  await logSearch(query, Array.isArray(result.items) ? result.items.length : 0, userId, source);
  return result;
}

export async function getVideoDetailsBatch(videoIds: string[]) {
  if (videoIds.length === 0) return { items: [] };
  const sorted = [...videoIds].sort();
  const cacheKey = `videos:${sorted.join(",")}`;
  const cached = getCached<unknown>(cacheKey);
  if (cached) return cached;

  const result = await youtubeGet("videos", {
    part: "snippet,contentDetails,statistics",
    id: videoIds.join(","),
  });
  setCache(cacheKey, result);
  return result;
}

export function getVideoDetails(videoId: string) {
  const cacheKey = `video:${videoId}`;
  const cached = getCached<unknown>(cacheKey);
  if (cached) return cached;

  return youtubeGet("videos", {
    part: "snippet,contentDetails,statistics",
    id: videoId,
  }).then((data) => {
    setCache(cacheKey, data);
    return data;
  });
}

export function getChannelDetails(channelId: string) {
  return youtubeGet("channels", {
    part: "snippet,statistics",
    id: channelId,
  });
}

export function getPlaylistItems(playlistId: string, maxResults = 20) {
  return youtubeGet("playlistItems", {
    part: "snippet,contentDetails",
    playlistId,
    maxResults: String(maxResults),
  });
}
