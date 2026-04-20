import { boolean, integer, pgEnum, pgTable, serial, text, timestamp, varchar, numeric, index, uniqueIndex } from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const textSizeEnum = pgEnum("text_size", ["small", "medium", "large"]);
export const searchSourceEnum = pgEnum("search_source", ["voice", "text", "category"]);
export const chatRoleEnum = pgEnum("chat_role", ["user", "assistant", "system"]);
export const announcementTypeEnum = pgEnum("announcement_type", ["info", "warning", "urgent"]);
export const relationStatusEnum = pgEnum("relation_status", ["pending", "verified", "revoked"]);
export const remoteSessionStatusEnum = pgEnum("remote_session_status", [
  "requested",
  "active",
  "ended",
  "rejected",
  "expired",
]);
export const remoteActionTypeEnum = pgEnum("remote_action_type", [
  "navigate",
  "play",
  "pause",
  "seek",
  "search",
  "bookmark_add",
  "bookmark_remove",
  "pref_update",
  "highlight",
  "speak",
  "other",
]);

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── User Preferences ───────────────────────────────────────────────────────
export const userPreferences = pgTable("user_preferences", {
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
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = typeof userPreferences.$inferInsert;

// ─── Bookmarks ───────────────────────────────────────────────────────────────
export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  videoId: varchar("video_id", { length: 32 }).notNull(),
  title: text("title").notNull(),
  channelName: text("channel_name"),
  thumbnailUrl: text("thumbnail_url"),
  duration: varchar("duration", { length: 32 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("bookmarks_user_video_idx").on(table.userId, table.videoId),
]);

export type Bookmark = typeof bookmarks.$inferSelect;
export type InsertBookmark = typeof bookmarks.$inferInsert;

// ─── Listening History ───────────────────────────────────────────────────────
export const listeningHistory = pgTable("listening_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  videoId: varchar("video_id", { length: 32 }).notNull(),
  title: text("title").notNull(),
  channelName: text("channel_name"),
  thumbnailUrl: text("thumbnail_url"),
  duration: varchar("duration", { length: 32 }),
  progressSeconds: integer("progress_seconds").default(0).notNull(),
  totalSeconds: integer("total_seconds").default(0).notNull(),
  lastPlayedAt: timestamp("last_played_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("history_user_video_idx").on(table.userId, table.videoId),
  index("history_user_played_idx").on(table.userId, table.lastPlayedAt),
]);

export type ListeningHistory = typeof listeningHistory.$inferSelect;
export type InsertListeningHistory = typeof listeningHistory.$inferInsert;

// ─── Search Logs ─────────────────────────────────────────────────────────────
export const searchLogs = pgTable("search_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  query: text("query").notNull(),
  resultCount: integer("result_count").default(0).notNull(),
  source: searchSourceEnum("source").default("text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("search_logs_created_idx").on(table.createdAt),
]);

export type SearchLog = typeof searchLogs.$inferSelect;
export type InsertSearchLog = typeof searchLogs.$inferInsert;

// ─── Chat Sessions ───────────────────────────────────────────────────────────
export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: varchar("title", { length: 200 }).default("새 대화").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("chat_sessions_user_idx").on(table.userId),
]);

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = typeof chatSessions.$inferInsert;

// ─── Chat Messages ───────────────────────────────────────────────────────────
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  role: chatRoleEnum("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("chat_messages_session_idx").on(table.sessionId),
]);

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

// ─── Categories ──────────────────────────────────────────────────────────────
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 10 }).notNull(),
  searchQuery: varchar("search_query", { length: 200 }).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

// ─── Curated Content ─────────────────────────────────────────────────────────
export const curatedContent = pgTable("curated_content", {
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
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("curated_category_idx").on(table.categorySlug),
]);

export type CuratedContent = typeof curatedContent.$inferSelect;
export type InsertCuratedContent = typeof curatedContent.$inferInsert;

// ─── App Config ──────────────────────────────────────────────────────────────
export const appConfig = pgTable("app_config", {
  id: serial("id").primaryKey(),
  configKey: varchar("config_key", { length: 128 }).notNull().unique(),
  configValue: text("config_value").notNull(),
  description: text("description"),
  updatedBy: integer("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AppConfig = typeof appConfig.$inferSelect;
export type InsertAppConfig = typeof appConfig.$inferInsert;

// ─── Announcements ───────────────────────────────────────────────────────────
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  type: announcementTypeEnum("type").default("info").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  startAt: timestamp("start_at"),
  endAt: timestamp("end_at"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = typeof announcements.$inferInsert;

// ─── Family Relations ────────────────────────────────────────────────────────
// 부모(피지원)-자녀(지원) 한 쌍. 단방향 1행으로 저장.
export const familyRelations = pgTable("family_relations", {
  id: serial("id").primaryKey(),
  parentUserId: integer("parent_user_id").notNull(),
  childUserId: integer("child_user_id").notNull(),
  status: relationStatusEnum("status").default("pending").notNull(),
  nickname: varchar("nickname", { length: 50 }),
  verifiedAt: timestamp("verified_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("family_relations_pair_idx").on(table.parentUserId, table.childUserId),
  index("family_relations_parent_idx").on(table.parentUserId),
  index("family_relations_child_idx").on(table.childUserId),
]);

export type FamilyRelation = typeof familyRelations.$inferSelect;
export type InsertFamilyRelation = typeof familyRelations.$inferInsert;

// ─── Invite Codes ────────────────────────────────────────────────────────────
// 6자리 숫자, 10분 만료, 1회용. 부모(피지원)가 발행.
export const inviteCodes = pgTable("invite_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 6 }).notNull().unique(),
  parentUserId: integer("parent_user_id").notNull(),
  consumedBy: integer("consumed_by"),
  consumedAt: timestamp("consumed_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("invite_codes_parent_idx").on(table.parentUserId),
  index("invite_codes_expires_idx").on(table.expiresAt),
]);

export type InviteCode = typeof inviteCodes.$inferSelect;
export type InsertInviteCode = typeof inviteCodes.$inferInsert;

// ─── Remote Sessions ─────────────────────────────────────────────────────────
// 자녀가 요청, 부모가 수락. sessionKey는 Ably 채널명 및 프론트 라우트 파라미터로 사용.
export const remoteSessions = pgTable("remote_sessions", {
  id: serial("id").primaryKey(),
  sessionKey: varchar("session_key", { length: 32 }).notNull().unique(),
  parentUserId: integer("parent_user_id").notNull(),
  childUserId: integer("child_user_id").notNull(),
  status: remoteSessionStatusEnum("status").default("requested").notNull(),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
  endedAt: timestamp("ended_at"),
  endedBy: integer("ended_by"),
  endReason: varchar("end_reason", { length: 50 }),
}, (table) => [
  index("remote_sessions_parent_idx").on(table.parentUserId),
  index("remote_sessions_child_idx").on(table.childUserId),
  index("remote_sessions_status_idx").on(table.status),
]);

export type RemoteSession = typeof remoteSessions.$inferSelect;
export type InsertRemoteSession = typeof remoteSessions.$inferInsert;

// ─── Remote Actions (Audit Log) ──────────────────────────────────────────────
// 세션 중 실행된 원격 명령 로그. 부모가 사후 확인 가능.
export const remoteActions = pgTable("remote_actions", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  actorUserId: integer("actor_user_id").notNull(),
  actionType: remoteActionTypeEnum("action_type").notNull(),
  payload: text("payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("remote_actions_session_idx").on(table.sessionId),
  index("remote_actions_created_idx").on(table.createdAt),
]);

export type RemoteAction = typeof remoteActions.$inferSelect;
export type InsertRemoteAction = typeof remoteActions.$inferInsert;
