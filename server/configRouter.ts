import { eq, and, or, isNull, lte, gte } from "drizzle-orm";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { categories, announcements, appConfig } from "../drizzle/schema";
import { asc } from "drizzle-orm";

export const configRouter = router({
  categories: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      // Fallback hardcoded categories when DB is unavailable
      return [
        { id: 0, slug: "novel", name: "소설", icon: "📖", searchQuery: "소설 오디오북", sortOrder: 0, isActive: true },
        { id: 0, slug: "essay", name: "에세이", icon: "✍️", searchQuery: "에세이 오디오북", sortOrder: 1, isActive: true },
        { id: 0, slug: "history", name: "역사", icon: "🏛️", searchQuery: "역사 오디오북", sortOrder: 2, isActive: true },
        { id: 0, slug: "economy", name: "경제", icon: "💼", searchQuery: "경제 오디오북", sortOrder: 3, isActive: true },
        { id: 0, slug: "selfhelp", name: "자기계발", icon: "🌱", searchQuery: "자기계발 오디오북", sortOrder: 4, isActive: true },
        { id: 0, slug: "popular", name: "인기 오디오북", icon: "⭐", searchQuery: "인기 오디오북", sortOrder: 5, isActive: true },
      ];
    }
    return db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder));
  }),

  announcements: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const now = new Date();
    return db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.isActive, true),
          or(isNull(announcements.startAt), lte(announcements.startAt, now)),
          or(isNull(announcements.endAt), gte(announcements.endAt, now))
        )
      );
  }),

  appSettings: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return {
        sttProvider: "webSpeech",
        sttLanguage: "ko-KR",
        maintenanceMode: false,
      };
    }
    const configs = await db
      .select({ configKey: appConfig.configKey, configValue: appConfig.configValue })
      .from(appConfig)
      .where(
        or(
          eq(appConfig.configKey, "stt.provider"),
          eq(appConfig.configKey, "stt.language"),
          eq(appConfig.configKey, "app.maintenanceMode")
        )
      );
    const configMap = new Map(configs.map((c) => [c.configKey, c.configValue]));
    return {
      sttProvider: configMap.get("stt.provider") ?? "webSpeech",
      sttLanguage: configMap.get("stt.language") ?? "ko-KR",
      maintenanceMode: configMap.get("app.maintenanceMode") === "true",
    };
  }),
});
