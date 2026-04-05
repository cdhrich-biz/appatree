import { boolean, integer, pgEnum, pgTable, serial, text, timestamp, varchar, numeric, index, uniqueIndex } from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const textSizeEnum = pgEnum("text_size", ["small", "medium", "large"]);
export const searchSourceEnum = pgEnum("search_source", ["voice", "text", "category"]);
export const chatRoleEnum = pgEnum("chat_role", ["user", "assistant", "system"]);
export const announcementTypeEnum = pgEnum("announcement_type", ["info", "warning", "urgent"]);

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
