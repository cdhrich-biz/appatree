// _api-src/trpc/handler.ts
import "dotenv/config";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/routers.ts
import { z as z7 } from "zod";

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  youtubeApiKey: process.env.YOUTUBE_API_KEY ?? ""
};

// server/_core/notification.ts
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/_core/youtube.ts
import { eq as eq2, or } from "drizzle-orm";

// drizzle/schema.ts
import { boolean, integer, pgEnum, pgTable, serial, text, timestamp, varchar, numeric, index, uniqueIndex } from "drizzle-orm/pg-core";
var roleEnum = pgEnum("role", ["user", "admin"]);
var textSizeEnum = pgEnum("text_size", ["small", "medium", "large"]);
var searchSourceEnum = pgEnum("search_source", ["voice", "text", "category"]);
var chatRoleEnum = pgEnum("chat_role", ["user", "assistant", "system"]);
var announcementTypeEnum = pgEnum("announcement_type", ["info", "warning", "urgent"]);
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull()
});
var userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  textSize: textSizeEnum("text_size").default("medium").notNull(),
  volume: integer("volume").default(70).notNull(),
  ttsSpeed: numeric("tts_speed", { precision: 3, scale: 2 }).default("0.90").notNull(),
  autoplay: boolean("autoplay").default(true).notNull(),
  preferredLanguage: varchar("preferred_language", { length: 10 }).default("ko-KR").notNull(),
  highContrast: boolean("high_contrast").default(false).notNull(),
  hasSeenOnboarding: boolean("has_seen_onboarding").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  videoId: varchar("video_id", { length: 32 }).notNull(),
  title: text("title").notNull(),
  channelName: text("channel_name"),
  thumbnailUrl: text("thumbnail_url"),
  duration: varchar("duration", { length: 32 }),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => [
  uniqueIndex("bookmarks_user_video_idx").on(table.userId, table.videoId)
]);
var listeningHistory = pgTable("listening_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  videoId: varchar("video_id", { length: 32 }).notNull(),
  title: text("title").notNull(),
  channelName: text("channel_name"),
  thumbnailUrl: text("thumbnail_url"),
  duration: varchar("duration", { length: 32 }),
  progressSeconds: integer("progress_seconds").default(0).notNull(),
  totalSeconds: integer("total_seconds").default(0).notNull(),
  lastPlayedAt: timestamp("last_played_at").defaultNow().notNull()
}, (table) => [
  uniqueIndex("history_user_video_idx").on(table.userId, table.videoId),
  index("history_user_played_idx").on(table.userId, table.lastPlayedAt)
]);
var searchLogs = pgTable("search_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  query: text("query").notNull(),
  resultCount: integer("result_count").default(0).notNull(),
  source: searchSourceEnum("source").default("text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => [
  index("search_logs_created_idx").on(table.createdAt)
]);
var chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: varchar("title", { length: 200 }).default("\uC0C8 \uB300\uD654").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => [
  index("chat_sessions_user_idx").on(table.userId)
]);
var chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  role: chatRoleEnum("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => [
  index("chat_messages_session_idx").on(table.sessionId)
]);
var categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 10 }).notNull(),
  searchQuery: varchar("search_query", { length: 200 }).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var curatedContent = pgTable("curated_content", {
  id: serial("id").primaryKey(),
  categorySlug: varchar("category_slug", { length: 64 }).notNull(),
  videoId: varchar("video_id", { length: 32 }).notNull(),
  title: text("title").notNull(),
  channelName: text("channel_name"),
  thumbnailUrl: text("thumbnail_url"),
  duration: varchar("duration", { length: 32 }),
  description: text("description"),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  addedBy: integer("added_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => [
  index("curated_category_idx").on(table.categorySlug)
]);
var appConfig = pgTable("app_config", {
  id: serial("id").primaryKey(),
  configKey: varchar("config_key", { length: 128 }).notNull().unique(),
  configValue: text("config_value").notNull(),
  description: text("description"),
  updatedBy: integer("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  type: announcementTypeEnum("type").default("info").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  startAt: timestamp("start_at"),
  endAt: timestamp("end_at"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// server/db.ts
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = postgres(process.env.DATABASE_URL);
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}

// server/_core/youtube.ts
var YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
var cache = /* @__PURE__ */ new Map();
var CACHE_TTL_MS = 5 * 60 * 1e3;
function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return void 0;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return void 0;
  }
  return entry.data;
}
function setCache(key, data) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}
var RATE_LIMIT_WINDOW_MS = 60 * 60 * 1e3;
async function getYouTubeConfig() {
  const db = await getDb();
  if (!db) {
    return { safeSearch: "strict", relevanceLanguage: "ko", audiobookSuffix: "\uC624\uB514\uC624\uBD81", defaultMaxResults: 10, blockedChannels: [], blockedKeywords: [] };
  }
  const configs = await db.select({ configKey: appConfig.configKey, configValue: appConfig.configValue }).from(appConfig).where(
    or(
      eq2(appConfig.configKey, "youtube.safeSearch"),
      eq2(appConfig.configKey, "youtube.relevanceLanguage"),
      eq2(appConfig.configKey, "youtube.audiobookSuffix"),
      eq2(appConfig.configKey, "youtube.defaultMaxResults"),
      eq2(appConfig.configKey, "youtube.blockedChannels"),
      eq2(appConfig.configKey, "youtube.blockedKeywords")
    )
  );
  const m = new Map(configs.map((c) => [c.configKey, c.configValue]));
  let blockedChannels = [];
  let blockedKeywords = [];
  try {
    blockedChannels = JSON.parse(m.get("youtube.blockedChannels") ?? "[]");
  } catch {
  }
  try {
    blockedKeywords = JSON.parse(m.get("youtube.blockedKeywords") ?? "[]");
  } catch {
  }
  return {
    safeSearch: m.get("youtube.safeSearch") ?? "strict",
    relevanceLanguage: m.get("youtube.relevanceLanguage") ?? "ko",
    audiobookSuffix: m.get("youtube.audiobookSuffix") ?? "\uC624\uB514\uC624\uBD81",
    defaultMaxResults: parseInt(m.get("youtube.defaultMaxResults") ?? "10", 10),
    blockedChannels,
    blockedKeywords
  };
}
async function youtubeGet(endpoint, params) {
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
  return res.json();
}
function filterResults(items, blockedChannels, blockedKeywords) {
  if (blockedChannels.length === 0 && blockedKeywords.length === 0) return items;
  const blockedChannelSet = new Set(blockedChannels.map((c) => c.toLowerCase()));
  const lowerKeywords = blockedKeywords.map((k) => k.toLowerCase());
  return items.filter((item) => {
    const snippet = item.snippet;
    if (!snippet) return true;
    const channelId = (snippet.channelId ?? "").toLowerCase();
    const channelTitle = (snippet.channelTitle ?? "").toLowerCase();
    if (blockedChannelSet.has(channelId) || blockedChannelSet.has(channelTitle)) return false;
    const title = (snippet.title ?? "").toLowerCase();
    const description = (snippet.description ?? "").toLowerCase();
    for (const keyword of lowerKeywords) {
      if (title.includes(keyword) || description.includes(keyword)) return false;
    }
    return true;
  });
}
async function logSearch(query, resultCount, userId, source = "text") {
  const db = await getDb();
  if (!db) return;
  await db.insert(searchLogs).values({ userId: userId ?? null, query, resultCount, source }).catch(() => {
  });
}
async function searchVideos(query, maxResults, userId, source, order, pageToken) {
  const config = await getYouTubeConfig();
  const fullQuery = `${query} ${config.audiobookSuffix}`.trim();
  const max = maxResults ?? config.defaultMaxResults;
  const orderVal = order ?? "relevance";
  const cacheKey = `search:${fullQuery}:${max}:${config.safeSearch}:${orderVal}:${pageToken ?? ""}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  const params = {
    part: "snippet",
    q: fullQuery,
    type: "video",
    maxResults: String(max),
    safeSearch: config.safeSearch,
    relevanceLanguage: config.relevanceLanguage,
    videoDuration: "long",
    order: orderVal
  };
  if (pageToken) params.pageToken = pageToken;
  const result = await youtubeGet("search", params);
  if (Array.isArray(result.items)) {
    result.items = filterResults(result.items, config.blockedChannels, config.blockedKeywords);
  }
  setCache(cacheKey, result);
  await logSearch(query, Array.isArray(result.items) ? result.items.length : 0, userId, source);
  return result;
}
async function getVideoDetailsBatch(videoIds) {
  if (videoIds.length === 0) return { items: [] };
  const sorted = [...videoIds].sort();
  const cacheKey = `videos:${sorted.join(",")}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  const result = await youtubeGet("videos", {
    part: "snippet,contentDetails,statistics",
    id: videoIds.join(",")
  });
  setCache(cacheKey, result);
  return result;
}
function getVideoDetails(videoId) {
  const cacheKey = `video:${videoId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  return youtubeGet("videos", {
    part: "snippet,contentDetails,statistics",
    id: videoId
  }).then((data) => {
    setCache(cacheKey, data);
    return data;
  });
}
function getChannelDetails(channelId) {
  return youtubeGet("channels", {
    part: "snippet,statistics",
    id: channelId
  });
}
function getPlaylistItems(playlistId, maxResults = 20) {
  return youtubeGet("playlistItems", {
    part: "snippet,contentDetails",
    playlistId,
    maxResults: String(maxResults)
  });
}

// server/voiceRouter.ts
import { z as z2 } from "zod";

// server/_core/voiceTranscription.ts
async function transcribeAudio(options) {
  try {
    if (!ENV.forgeApiUrl) {
      return {
        error: "Voice transcription service is not configured",
        code: "SERVICE_ERROR",
        details: "BUILT_IN_FORGE_API_URL is not set"
      };
    }
    if (!ENV.forgeApiKey) {
      return {
        error: "Voice transcription service authentication is missing",
        code: "SERVICE_ERROR",
        details: "BUILT_IN_FORGE_API_KEY is not set"
      };
    }
    let audioBuffer;
    let mimeType;
    try {
      const response2 = await fetch(options.audioUrl);
      if (!response2.ok) {
        return {
          error: "Failed to download audio file",
          code: "INVALID_FORMAT",
          details: `HTTP ${response2.status}: ${response2.statusText}`
        };
      }
      audioBuffer = Buffer.from(await response2.arrayBuffer());
      mimeType = response2.headers.get("content-type") || "audio/mpeg";
      const sizeMB = audioBuffer.length / (1024 * 1024);
      if (sizeMB > 16) {
        return {
          error: "Audio file exceeds maximum size limit",
          code: "FILE_TOO_LARGE",
          details: `File size is ${sizeMB.toFixed(2)}MB, maximum allowed is 16MB`
        };
      }
    } catch (error) {
      return {
        error: "Failed to fetch audio file",
        code: "SERVICE_ERROR",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
    const formData = new FormData();
    const filename = `audio.${getFileExtension(mimeType)}`;
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    formData.append("file", audioBlob, filename);
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    const prompt = options.prompt || (options.language ? `Transcribe the user's voice to text, the user's working language is ${getLanguageName(options.language)}` : "Transcribe the user's voice to text");
    formData.append("prompt", prompt);
    const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
    const fullUrl = new URL(
      "v1/audio/transcriptions",
      baseUrl
    ).toString();
    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "Accept-Encoding": "identity"
      },
      body: formData
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        error: "Transcription service request failed",
        code: "TRANSCRIPTION_FAILED",
        details: `${response.status} ${response.statusText}${errorText ? `: ${errorText}` : ""}`
      };
    }
    const whisperResponse = await response.json();
    if (!whisperResponse.text || typeof whisperResponse.text !== "string") {
      return {
        error: "Invalid transcription response",
        code: "SERVICE_ERROR",
        details: "Transcription service returned an invalid response format"
      };
    }
    return whisperResponse;
  } catch (error) {
    return {
      error: "Voice transcription failed",
      code: "SERVICE_ERROR",
      details: error instanceof Error ? error.message : "An unexpected error occurred"
    };
  }
}
function getFileExtension(mimeType) {
  const mimeToExt = {
    "audio/webm": "webm",
    "audio/mp3": "mp3",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/ogg": "ogg",
    "audio/m4a": "m4a",
    "audio/mp4": "m4a"
  };
  return mimeToExt[mimeType] || "audio";
}
function getLanguageName(langCode) {
  const langMap = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "ru": "Russian",
    "ja": "Japanese",
    "ko": "Korean",
    "zh": "Chinese",
    "ar": "Arabic",
    "hi": "Hindi",
    "nl": "Dutch",
    "pl": "Polish",
    "tr": "Turkish",
    "sv": "Swedish",
    "da": "Danish",
    "no": "Norwegian",
    "fi": "Finnish"
  };
  return langMap[langCode] || langCode;
}

// server/voiceRouter.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
var voiceRouter = router({
  transcribe: protectedProcedure.input(
    z2.object({
      audioUrl: z2.string().url(),
      language: z2.string().optional(),
      prompt: z2.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const result = await transcribeAudio(input);
    if ("error" in result) {
      throw new TRPCError3({
        code: "BAD_REQUEST",
        message: result.error,
        cause: result
      });
    }
    const db = await getDb();
    if (db && result.text) {
      await db.insert(searchLogs).values({
        userId: ctx.user.id,
        query: result.text,
        resultCount: 0,
        source: "voice"
      });
    }
    return result;
  })
});

// server/libraryRouter.ts
import { z as z3 } from "zod";
import { eq as eq3, and, desc } from "drizzle-orm";
import { TRPCError as TRPCError4 } from "@trpc/server";
function requireDb(db) {
  if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return db;
}
var libraryRouter = router({
  addBookmark: protectedProcedure.input(
    z3.object({
      videoId: z3.string(),
      title: z3.string(),
      channelName: z3.string().optional(),
      thumbnailUrl: z3.string().optional(),
      duration: z3.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = requireDb(await getDb());
    await db.insert(bookmarks).values({ userId: ctx.user.id, ...input }).onConflictDoUpdate({
      target: [bookmarks.userId, bookmarks.videoId],
      set: { title: input.title, channelName: input.channelName, thumbnailUrl: input.thumbnailUrl, duration: input.duration }
    });
    return { success: true };
  }),
  removeBookmark: protectedProcedure.input(z3.object({ videoId: z3.string() })).mutation(async ({ input, ctx }) => {
    const db = requireDb(await getDb());
    await db.delete(bookmarks).where(and(eq3(bookmarks.userId, ctx.user.id), eq3(bookmarks.videoId, input.videoId)));
    return { success: true };
  }),
  bookmarks: protectedProcedure.input(z3.object({ limit: z3.number().min(1).max(50).default(20), offset: z3.number().min(0).default(0) })).query(async ({ input, ctx }) => {
    const db = requireDb(await getDb());
    const items = await db.select().from(bookmarks).where(eq3(bookmarks.userId, ctx.user.id)).orderBy(desc(bookmarks.createdAt)).limit(input.limit).offset(input.offset);
    return items;
  }),
  isBookmarked: protectedProcedure.input(z3.object({ videoId: z3.string() })).query(async ({ input, ctx }) => {
    const db = requireDb(await getDb());
    const result = await db.select({ id: bookmarks.id }).from(bookmarks).where(and(eq3(bookmarks.userId, ctx.user.id), eq3(bookmarks.videoId, input.videoId))).limit(1);
    return result.length > 0;
  }),
  addHistory: protectedProcedure.input(
    z3.object({
      videoId: z3.string(),
      title: z3.string(),
      channelName: z3.string().optional(),
      thumbnailUrl: z3.string().optional(),
      duration: z3.string().optional(),
      progressSeconds: z3.number().default(0),
      totalSeconds: z3.number().default(0)
    })
  ).mutation(async ({ input, ctx }) => {
    const db = requireDb(await getDb());
    await db.insert(listeningHistory).values({ userId: ctx.user.id, ...input, lastPlayedAt: /* @__PURE__ */ new Date() }).onConflictDoUpdate({
      target: [listeningHistory.userId, listeningHistory.videoId],
      set: {
        title: input.title,
        channelName: input.channelName,
        thumbnailUrl: input.thumbnailUrl,
        duration: input.duration,
        progressSeconds: input.progressSeconds,
        totalSeconds: input.totalSeconds,
        lastPlayedAt: /* @__PURE__ */ new Date()
      }
    });
    return { success: true };
  }),
  history: protectedProcedure.input(z3.object({ limit: z3.number().min(1).max(50).default(20), offset: z3.number().min(0).default(0) })).query(async ({ input, ctx }) => {
    const db = requireDb(await getDb());
    const items = await db.select().from(listeningHistory).where(eq3(listeningHistory.userId, ctx.user.id)).orderBy(desc(listeningHistory.lastPlayedAt)).limit(input.limit).offset(input.offset);
    return items;
  }),
  updateProgress: protectedProcedure.input(z3.object({ videoId: z3.string(), progressSeconds: z3.number(), totalSeconds: z3.number().optional() })).mutation(async ({ input, ctx }) => {
    const db = requireDb(await getDb());
    const updateSet = {
      progressSeconds: input.progressSeconds,
      lastPlayedAt: /* @__PURE__ */ new Date()
    };
    if (input.totalSeconds !== void 0) {
      updateSet.totalSeconds = input.totalSeconds;
    }
    await db.update(listeningHistory).set(updateSet).where(and(eq3(listeningHistory.userId, ctx.user.id), eq3(listeningHistory.videoId, input.videoId)));
    return { success: true };
  }),
  clearHistory: protectedProcedure.mutation(async ({ ctx }) => {
    const db = requireDb(await getDb());
    await db.delete(listeningHistory).where(eq3(listeningHistory.userId, ctx.user.id));
    return { success: true };
  }),
  clearBookmarks: protectedProcedure.mutation(async ({ ctx }) => {
    const db = requireDb(await getDb());
    await db.delete(bookmarks).where(eq3(bookmarks.userId, ctx.user.id));
    return { success: true };
  })
});

// server/chatRouter.ts
import { z as z4 } from "zod";
import { eq as eq4, desc as desc2, asc } from "drizzle-orm";

// server/_core/llm.ts
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
var assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format
  } = params;
  const payload = {
    model: "gemini-2.5-flash",
    messages: messages.map(normalizeMessage)
  };
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  payload.max_tokens = 32768;
  payload.thinking = {
    "budget_tokens": 128
  };
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetch(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}

// server/chatRouter.ts
import { TRPCError as TRPCError5 } from "@trpc/server";
function requireDb2(db) {
  if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return db;
}
var DEFAULT_SYSTEM_PROMPT = `\uB2F9\uC2E0\uC740 \uC2DC\uB2C8\uC5B4 \uC0AC\uC6A9\uC790\uB97C \uC704\uD55C \uC624\uB514\uC624\uBD81 \uCD94\uCC9C \uB3C4\uC6B0\uBBF8\uC785\uB2C8\uB2E4.
- \uD56D\uC0C1 \uD55C\uAD6D\uC5B4\uB85C \uB300\uD654\uD558\uC138\uC694.
- \uCE5C\uC808\uD558\uACE0 \uC26C\uC6B4 \uB9D0\uC744 \uC0AC\uC6A9\uD558\uC138\uC694.
- \uC624\uB514\uC624\uBD81\uACFC \uCC45\uC744 \uCD94\uCC9C\uD560 \uB54C \uC81C\uBAA9, \uC800\uC790, \uAC04\uB2E8\uD55C \uC124\uBA85\uC744 \uD3EC\uD568\uD558\uC138\uC694.
- \uCD94\uCC9C\uD560 \uB54C \uB2E4\uC74C JSON \uD615\uC2DD\uC758 \uBE14\uB85D\uC744 \uD3EC\uD568\uD558\uC138\uC694:
  [RECOMMEND]{"title":"\uCC45 \uC81C\uBAA9","author":"\uC800\uC790","description":"\uC124\uBA85","searchQuery":"YouTube \uAC80\uC0C9\uC5B4"}[/RECOMMEND]
- \uC0AC\uC6A9\uC790\uC758 \uCDE8\uD5A5\uACFC \uAD00\uC2EC\uC0AC\uB97C \uD30C\uC545\uD558\uC5EC \uB9DE\uCDA4 \uCD94\uCC9C\uC744 \uD574\uC8FC\uC138\uC694.`;
var DEFAULT_GREETING = "\uC548\uB155\uD558\uC138\uC694! \uC800\uB294 \uB2F9\uC2E0\uC758 \uC624\uB514\uC624\uBD81 \uCD94\uCC9C \uB3C4\uC6B0\uBBF8\uC785\uB2C8\uB2E4. \uC5B4\uB5A4 \uCC45\uC744 \uCC3E\uACE0 \uACC4\uC2E0\uAC00\uC694?";
var MAX_HISTORY_TURNS = 10;
async function getConfigValue(db, key, fallback) {
  const result = await db.select({ configValue: appConfig.configValue }).from(appConfig).where(eq4(appConfig.configKey, key)).limit(1);
  return result.length > 0 ? result[0].configValue : fallback;
}
var chatRouter = router({
  send: protectedProcedure.input(z4.object({ sessionId: z4.number().optional(), message: z4.string().min(1) })).mutation(async ({ input, ctx }) => {
    const db = requireDb2(await getDb());
    let sessionId = input.sessionId;
    if (!sessionId) {
      const title = input.message.slice(0, 50) + (input.message.length > 50 ? "..." : "");
      const [inserted] = await db.insert(chatSessions).values({ userId: ctx.user.id, title }).returning({ id: chatSessions.id });
      sessionId = inserted.id;
    } else {
      const session = await db.select({ userId: chatSessions.userId }).from(chatSessions).where(eq4(chatSessions.id, sessionId)).limit(1);
      if (session.length === 0 || session[0].userId !== ctx.user.id) {
        throw new TRPCError5({ code: "NOT_FOUND", message: "Session not found" });
      }
    }
    await db.insert(chatMessages).values({ sessionId, role: "user", content: input.message });
    const systemPrompt = await getConfigValue(db, "ai.systemPrompt", DEFAULT_SYSTEM_PROMPT);
    const temperatureStr = await getConfigValue(db, "ai.temperature", "0.7");
    const maxTokensStr = await getConfigValue(db, "ai.maxTokens", "2048");
    const history = await db.select({ role: chatMessages.role, content: chatMessages.content }).from(chatMessages).where(eq4(chatMessages.sessionId, sessionId)).orderBy(desc2(chatMessages.createdAt)).limit(MAX_HISTORY_TURNS * 2);
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.reverse().map((m) => ({
        role: m.role,
        content: m.content
      }))
    ];
    const result = await invokeLLM({
      messages,
      maxTokens: parseInt(maxTokensStr, 10)
    });
    const assistantContent = typeof result.choices[0]?.message?.content === "string" ? result.choices[0].message.content : Array.isArray(result.choices[0]?.message?.content) ? result.choices[0].message.content.filter((p) => p.type === "text").map((p) => p.text).join("") : "";
    await db.insert(chatMessages).values({ sessionId, role: "assistant", content: assistantContent });
    return {
      sessionId,
      message: assistantContent
    };
  }),
  sessions: protectedProcedure.query(async ({ ctx }) => {
    const db = requireDb2(await getDb());
    return db.select().from(chatSessions).where(eq4(chatSessions.userId, ctx.user.id)).orderBy(desc2(chatSessions.updatedAt));
  }),
  history: protectedProcedure.input(z4.object({ sessionId: z4.number() })).query(async ({ input, ctx }) => {
    const db = requireDb2(await getDb());
    const session = await db.select({ userId: chatSessions.userId }).from(chatSessions).where(eq4(chatSessions.id, input.sessionId)).limit(1);
    if (session.length === 0 || session[0].userId !== ctx.user.id) {
      throw new TRPCError5({ code: "NOT_FOUND", message: "Session not found" });
    }
    return db.select().from(chatMessages).where(eq4(chatMessages.sessionId, input.sessionId)).orderBy(asc(chatMessages.createdAt));
  }),
  deleteSession: protectedProcedure.input(z4.object({ sessionId: z4.number() })).mutation(async ({ input, ctx }) => {
    const db = requireDb2(await getDb());
    const session = await db.select({ userId: chatSessions.userId }).from(chatSessions).where(eq4(chatSessions.id, input.sessionId)).limit(1);
    if (session.length === 0 || session[0].userId !== ctx.user.id) {
      throw new TRPCError5({ code: "NOT_FOUND", message: "Session not found" });
    }
    await db.delete(chatMessages).where(eq4(chatMessages.sessionId, input.sessionId));
    await db.delete(chatSessions).where(eq4(chatSessions.id, input.sessionId));
    return { success: true };
  }),
  greeting: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return DEFAULT_GREETING;
    return getConfigValue(db, "ai.greetingMessage", DEFAULT_GREETING);
  })
});

// server/preferencesRouter.ts
import { z as z5 } from "zod";
import { eq as eq5 } from "drizzle-orm";
import { TRPCError as TRPCError6 } from "@trpc/server";
function requireDb3(db) {
  if (!db) throw new TRPCError6({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return db;
}
var DEFAULTS = {
  textSize: "medium",
  volume: 70,
  ttsSpeed: "0.90",
  autoplay: true,
  preferredLanguage: "ko-KR",
  highContrast: false,
  hasSeenOnboarding: false
};
var preferencesRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const db = requireDb3(await getDb());
    const result = await db.select().from(userPreferences).where(eq5(userPreferences.userId, ctx.user.id)).limit(1);
    if (result.length === 0) {
      return { ...DEFAULTS, userId: ctx.user.id };
    }
    return result[0];
  }),
  update: protectedProcedure.input(
    z5.object({
      textSize: z5.enum(["small", "medium", "large"]).optional(),
      volume: z5.number().min(0).max(100).optional(),
      ttsSpeed: z5.string().optional(),
      autoplay: z5.boolean().optional(),
      preferredLanguage: z5.string().optional(),
      highContrast: z5.boolean().optional(),
      hasSeenOnboarding: z5.boolean().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = requireDb3(await getDb());
    const existing = await db.select({ id: userPreferences.id }).from(userPreferences).where(eq5(userPreferences.userId, ctx.user.id)).limit(1);
    if (existing.length === 0) {
      await db.insert(userPreferences).values({
        userId: ctx.user.id,
        ...DEFAULTS,
        ...input
      });
    } else {
      await db.update(userPreferences).set(input).where(eq5(userPreferences.userId, ctx.user.id));
    }
    return { success: true };
  })
});

// server/configRouter.ts
import { eq as eq6, and as and3, or as or2, isNull, lte, gte } from "drizzle-orm";
import { asc as asc2 } from "drizzle-orm";
var configRouter = router({
  categories: publicProcedure.query(async () => {
    const fallback = [
      { id: 0, slug: "novel", name: "\uC18C\uC124", icon: "\u{1F4D6}", searchQuery: "\uC18C\uC124 \uC624\uB514\uC624\uBD81", sortOrder: 0, isActive: true, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() },
      { id: 0, slug: "essay", name: "\uC5D0\uC138\uC774", icon: "\u270D\uFE0F", searchQuery: "\uC5D0\uC138\uC774 \uC624\uB514\uC624\uBD81", sortOrder: 1, isActive: true, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() },
      { id: 0, slug: "history", name: "\uC5ED\uC0AC", icon: "\u{1F3DB}\uFE0F", searchQuery: "\uC5ED\uC0AC \uC624\uB514\uC624\uBD81", sortOrder: 2, isActive: true, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() },
      { id: 0, slug: "economy", name: "\uACBD\uC81C", icon: "\u{1F4BC}", searchQuery: "\uACBD\uC81C \uC624\uB514\uC624\uBD81", sortOrder: 3, isActive: true, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() },
      { id: 0, slug: "selfhelp", name: "\uC790\uAE30\uACC4\uBC1C", icon: "\u{1F331}", searchQuery: "\uC790\uAE30\uACC4\uBC1C \uC624\uB514\uC624\uBD81", sortOrder: 4, isActive: true, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() },
      { id: 0, slug: "popular", name: "\uC778\uAE30 \uC624\uB514\uC624\uBD81", icon: "\u2B50", searchQuery: "\uC778\uAE30 \uC624\uB514\uC624\uBD81", sortOrder: 5, isActive: true, createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }
    ];
    try {
      const db = await getDb();
      if (!db) return fallback;
      return await db.select().from(categories).where(eq6(categories.isActive, true)).orderBy(asc2(categories.sortOrder));
    } catch (e) {
      console.error("[config.categories] DB error, using fallback:", e);
      return fallback;
    }
  }),
  announcements: publicProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) return [];
      const now = /* @__PURE__ */ new Date();
      return await db.select().from(announcements).where(
        and3(
          eq6(announcements.isActive, true),
          or2(isNull(announcements.startAt), lte(announcements.startAt, now)),
          or2(isNull(announcements.endAt), gte(announcements.endAt, now))
        )
      );
    } catch (e) {
      console.error("[config.announcements] DB error:", e);
      return [];
    }
  }),
  appSettings: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return {
        sttProvider: "webSpeech",
        sttLanguage: "ko-KR",
        maintenanceMode: false
      };
    }
    const configs = await db.select({ configKey: appConfig.configKey, configValue: appConfig.configValue }).from(appConfig).where(
      or2(
        eq6(appConfig.configKey, "stt.provider"),
        eq6(appConfig.configKey, "stt.language"),
        eq6(appConfig.configKey, "app.maintenanceMode")
      )
    );
    const configMap = new Map(configs.map((c) => [c.configKey, c.configValue]));
    return {
      sttProvider: configMap.get("stt.provider") ?? "webSpeech",
      sttLanguage: configMap.get("stt.language") ?? "ko-KR",
      maintenanceMode: configMap.get("app.maintenanceMode") === "true"
    };
  })
});

// server/adminRouter.ts
import { z as z6 } from "zod";
import { eq as eq7, desc as desc3, asc as asc3, sql as sql2, and as and4, gte as gte2, like, or as or3 } from "drizzle-orm";
import { TRPCError as TRPCError7 } from "@trpc/server";
function requireDb4(db) {
  if (!db) throw new TRPCError7({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return db;
}
var usersRouter = router({
  list: adminProcedure.input(
    z6.object({
      limit: z6.number().min(1).max(100).default(20),
      offset: z6.number().min(0).default(0),
      search: z6.string().optional(),
      role: z6.enum(["user", "admin"]).optional()
    })
  ).query(async ({ input }) => {
    const db = requireDb4(await getDb());
    let query = db.select().from(users);
    const conditions = [];
    if (input.role) conditions.push(eq7(users.role, input.role));
    if (input.search) {
      conditions.push(
        or3(like(users.name, `%${input.search}%`), like(users.email, `%${input.search}%`))
      );
    }
    if (conditions.length > 0) query = query.where(and4(...conditions));
    const items = await query.orderBy(desc3(users.createdAt)).limit(input.limit).offset(input.offset);
    const [countResult] = await db.select({ count: sql2`count(*)` }).from(users);
    return { items, total: countResult.count };
  }),
  updateRole: adminProcedure.input(z6.object({ userId: z6.number(), role: z6.enum(["user", "admin"]) })).mutation(async ({ input }) => {
    const db = requireDb4(await getDb());
    await db.update(users).set({ role: input.role }).where(eq7(users.id, input.userId));
    return { success: true };
  })
});
var categoriesRouter = router({
  list: adminProcedure.query(async () => {
    const db = requireDb4(await getDb());
    return db.select().from(categories).orderBy(asc3(categories.sortOrder));
  }),
  create: adminProcedure.input(
    z6.object({
      slug: z6.string().min(1).max(64),
      name: z6.string().min(1).max(100),
      icon: z6.string().min(1).max(10),
      searchQuery: z6.string().min(1).max(200),
      sortOrder: z6.number().default(0),
      isActive: z6.boolean().default(true)
    })
  ).mutation(async ({ input }) => {
    const db = requireDb4(await getDb());
    await db.insert(categories).values(input);
    return { success: true };
  }),
  update: adminProcedure.input(
    z6.object({
      id: z6.number(),
      slug: z6.string().min(1).max(64).optional(),
      name: z6.string().min(1).max(100).optional(),
      icon: z6.string().min(1).max(10).optional(),
      searchQuery: z6.string().min(1).max(200).optional(),
      sortOrder: z6.number().optional(),
      isActive: z6.boolean().optional()
    })
  ).mutation(async ({ input }) => {
    const db = requireDb4(await getDb());
    const { id, ...data } = input;
    await db.update(categories).set(data).where(eq7(categories.id, id));
    return { success: true };
  }),
  delete: adminProcedure.input(z6.object({ id: z6.number() })).mutation(async ({ input }) => {
    const db = requireDb4(await getDb());
    await db.delete(categories).where(eq7(categories.id, input.id));
    return { success: true };
  }),
  reorder: adminProcedure.input(z6.array(z6.object({ id: z6.number(), sortOrder: z6.number() }))).mutation(async ({ input }) => {
    const db = requireDb4(await getDb());
    for (const item of input) {
      await db.update(categories).set({ sortOrder: item.sortOrder }).where(eq7(categories.id, item.id));
    }
    return { success: true };
  })
});
var curatedRouter = router({
  list: adminProcedure.input(z6.object({ categorySlug: z6.string().optional() })).query(async ({ input }) => {
    const db = requireDb4(await getDb());
    let query = db.select().from(curatedContent);
    if (input.categorySlug) {
      query = query.where(eq7(curatedContent.categorySlug, input.categorySlug));
    }
    return query.orderBy(asc3(curatedContent.sortOrder));
  }),
  create: adminProcedure.input(
    z6.object({
      categorySlug: z6.string(),
      videoId: z6.string(),
      title: z6.string(),
      channelName: z6.string().optional(),
      thumbnailUrl: z6.string().optional(),
      duration: z6.string().optional(),
      description: z6.string().optional(),
      sortOrder: z6.number().default(0),
      isActive: z6.boolean().default(true)
    })
  ).mutation(async ({ input, ctx }) => {
    const db = requireDb4(await getDb());
    await db.insert(curatedContent).values({ ...input, addedBy: ctx.user.id });
    return { success: true };
  }),
  update: adminProcedure.input(
    z6.object({
      id: z6.number(),
      categorySlug: z6.string().optional(),
      title: z6.string().optional(),
      description: z6.string().optional(),
      sortOrder: z6.number().optional(),
      isActive: z6.boolean().optional()
    })
  ).mutation(async ({ input }) => {
    const db = requireDb4(await getDb());
    const { id, ...data } = input;
    await db.update(curatedContent).set(data).where(eq7(curatedContent.id, id));
    return { success: true };
  }),
  delete: adminProcedure.input(z6.object({ id: z6.number() })).mutation(async ({ input }) => {
    const db = requireDb4(await getDb());
    await db.delete(curatedContent).where(eq7(curatedContent.id, input.id));
    return { success: true };
  }),
  searchYouTube: adminProcedure.input(z6.object({ query: z6.string(), maxResults: z6.number().default(10) })).query(({ input }) => searchVideos(input.query, input.maxResults))
});
var configAdminRouter = router({
  list: adminProcedure.query(async () => {
    const db = requireDb4(await getDb());
    return db.select().from(appConfig);
  }),
  get: adminProcedure.input(z6.object({ key: z6.string() })).query(async ({ input }) => {
    const db = requireDb4(await getDb());
    const result = await db.select().from(appConfig).where(eq7(appConfig.configKey, input.key)).limit(1);
    return result[0] ?? null;
  }),
  update: adminProcedure.input(z6.object({ key: z6.string(), value: z6.string(), description: z6.string().optional() })).mutation(async ({ input, ctx }) => {
    const db = requireDb4(await getDb());
    await db.insert(appConfig).values({
      configKey: input.key,
      configValue: input.value,
      description: input.description,
      updatedBy: ctx.user.id
    }).onConflictDoUpdate({
      target: appConfig.configKey,
      set: {
        configValue: input.value,
        description: input.description,
        updatedBy: ctx.user.id
      }
    });
    return { success: true };
  })
});
var announcementsRouter = router({
  list: adminProcedure.query(async () => {
    const db = requireDb4(await getDb());
    return db.select().from(announcements).orderBy(desc3(announcements.createdAt));
  }),
  create: adminProcedure.input(
    z6.object({
      title: z6.string().min(1).max(200),
      content: z6.string().min(1),
      type: z6.enum(["info", "warning", "urgent"]).default("info"),
      isActive: z6.boolean().default(true),
      startAt: z6.string().datetime().optional(),
      endAt: z6.string().datetime().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = requireDb4(await getDb());
    await db.insert(announcements).values({
      ...input,
      startAt: input.startAt ? new Date(input.startAt) : null,
      endAt: input.endAt ? new Date(input.endAt) : null,
      createdBy: ctx.user.id
    });
    return { success: true };
  }),
  update: adminProcedure.input(
    z6.object({
      id: z6.number(),
      title: z6.string().min(1).max(200).optional(),
      content: z6.string().optional(),
      type: z6.enum(["info", "warning", "urgent"]).optional(),
      isActive: z6.boolean().optional(),
      startAt: z6.string().datetime().nullable().optional(),
      endAt: z6.string().datetime().nullable().optional()
    })
  ).mutation(async ({ input }) => {
    const db = requireDb4(await getDb());
    const { id, startAt, endAt, ...rest } = input;
    const data = { ...rest };
    if (startAt !== void 0) data.startAt = startAt ? new Date(startAt) : null;
    if (endAt !== void 0) data.endAt = endAt ? new Date(endAt) : null;
    await db.update(announcements).set(data).where(eq7(announcements.id, id));
    return { success: true };
  }),
  delete: adminProcedure.input(z6.object({ id: z6.number() })).mutation(async ({ input }) => {
    const db = requireDb4(await getDb());
    await db.delete(announcements).where(eq7(announcements.id, input.id));
    return { success: true };
  })
});
var analyticsRouter = router({
  overview: adminProcedure.query(async () => {
    const db = requireDb4(await getDb());
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const [totalUsers] = await db.select({ count: sql2`count(*)` }).from(users);
    const [todaySearches] = await db.select({ count: sql2`count(*)` }).from(searchLogs).where(gte2(searchLogs.createdAt, today));
    const [totalBookmarks] = await db.select({ count: sql2`count(*)` }).from(bookmarks);
    const [activeAnnouncements] = await db.select({ count: sql2`count(*)` }).from(announcements).where(eq7(announcements.isActive, true));
    return {
      totalUsers: totalUsers.count,
      todaySearches: todaySearches.count,
      totalBookmarks: totalBookmarks.count,
      activeAnnouncements: activeAnnouncements.count
    };
  }),
  searchLogs: adminProcedure.input(
    z6.object({
      days: z6.number().min(1).max(90).default(30),
      limit: z6.number().min(1).max(100).default(50)
    })
  ).query(async ({ input }) => {
    const db = requireDb4(await getDb());
    const since = /* @__PURE__ */ new Date();
    since.setDate(since.getDate() - input.days);
    const dailyCounts = await db.select({
      date: sql2`DATE(${searchLogs.createdAt})`,
      count: sql2`count(*)`,
      voiceCount: sql2`SUM(CASE WHEN ${searchLogs.source} = 'voice' THEN 1 ELSE 0 END)`,
      textCount: sql2`SUM(CASE WHEN ${searchLogs.source} = 'text' THEN 1 ELSE 0 END)`
    }).from(searchLogs).where(gte2(searchLogs.createdAt, since)).groupBy(sql2`DATE(${searchLogs.createdAt})`).orderBy(sql2`DATE(${searchLogs.createdAt})`);
    const topQueries = await db.select({
      query: searchLogs.query,
      count: sql2`count(*)`
    }).from(searchLogs).where(gte2(searchLogs.createdAt, since)).groupBy(searchLogs.query).orderBy(desc3(sql2`count(*)`)).limit(input.limit);
    return { dailyCounts, topQueries };
  }),
  userActivity: adminProcedure.input(z6.object({ days: z6.number().min(1).max(90).default(30) })).query(async ({ input }) => {
    const db = requireDb4(await getDb());
    const since = /* @__PURE__ */ new Date();
    since.setDate(since.getDate() - input.days);
    const signups = await db.select({
      date: sql2`DATE(${users.createdAt})`,
      count: sql2`count(*)`
    }).from(users).where(gte2(users.createdAt, since)).groupBy(sql2`DATE(${users.createdAt})`).orderBy(sql2`DATE(${users.createdAt})`);
    return { signups };
  }),
  popularContent: adminProcedure.input(z6.object({ limit: z6.number().min(1).max(50).default(10) })).query(async ({ input }) => {
    const db = requireDb4(await getDb());
    const topBookmarked = await db.select({
      videoId: bookmarks.videoId,
      title: bookmarks.title,
      count: sql2`count(*)`
    }).from(bookmarks).groupBy(bookmarks.videoId, bookmarks.title).orderBy(desc3(sql2`count(*)`)).limit(input.limit);
    const topPlayed = await db.select({
      videoId: listeningHistory.videoId,
      title: listeningHistory.title,
      count: sql2`count(*)`
    }).from(listeningHistory).groupBy(listeningHistory.videoId, listeningHistory.title).orderBy(desc3(sql2`count(*)`)).limit(input.limit);
    return { topBookmarked, topPlayed };
  })
});
var adminRouter = router({
  users: usersRouter,
  categories: categoriesRouter,
  curated: curatedRouter,
  config: configAdminRouter,
  announcements: announcementsRouter,
  analytics: analyticsRouter
});

// server/routers.ts
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  youtube: router({
    search: publicProcedure.input(z7.object({ query: z7.string(), maxResults: z7.number().optional(), order: z7.string().optional(), pageToken: z7.string().optional() })).query(({ input }) => searchVideos(input.query, input.maxResults, void 0, void 0, input.order, input.pageToken)),
    videosBatch: publicProcedure.input(z7.object({ videoIds: z7.array(z7.string()).max(50) })).query(({ input }) => getVideoDetailsBatch(input.videoIds)),
    video: publicProcedure.input(z7.object({ videoId: z7.string() })).query(({ input }) => getVideoDetails(input.videoId)),
    channel: publicProcedure.input(z7.object({ channelId: z7.string() })).query(({ input }) => getChannelDetails(input.channelId)),
    playlist: publicProcedure.input(z7.object({ playlistId: z7.string(), maxResults: z7.number().optional() })).query(({ input }) => getPlaylistItems(input.playlistId, input.maxResults))
  }),
  voice: voiceRouter,
  library: libraryRouter,
  chat: chatRouter,
  preferences: preferencesRouter,
  config: configRouter,
  admin: adminRouter
});

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString2 = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString2(openId) || !isNonEmptyString2(appId) || !isNonEmptyString2(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// _api-src/trpc/handler.ts
async function handler(req, res) {
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  const url = `${protocol}://${host}${req.url}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(", "));
  }
  const fetchReq = new Request(url, {
    method: req.method,
    headers,
    body: req.method !== "GET" && req.method !== "HEAD" ? JSON.stringify(req.body) : void 0
  });
  const fetchRes = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req: fetchReq,
    router: appRouter,
    createContext: () => createContext({ req, res })
  });
  fetchRes.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  res.status(fetchRes.status);
  const body = await fetchRes.text();
  res.send(body);
}
export {
  handler as default
};
