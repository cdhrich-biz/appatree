import { z } from "zod";
import { eq, desc, asc, sql, and, gte, lte, like, or } from "drizzle-orm";
import { adminProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import {
  users,
  categories,
  curatedContent,
  appConfig,
  announcements,
  searchLogs,
  bookmarks,
  listeningHistory,
} from "../drizzle/schema";
import { searchVideos } from "./_core/youtube";
import { TRPCError } from "@trpc/server";

function requireDb(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return db;
}

// ─── Users ───────────────────────────────────────────────────────────────────
const usersRouter = router({
  list: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        search: z.string().optional(),
        role: z.enum(["user", "admin"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = requireDb(await getDb());
      let query = db.select().from(users);
      const conditions = [];
      if (input.role) conditions.push(eq(users.role, input.role));
      if (input.search) {
        conditions.push(
          or(like(users.name, `%${input.search}%`), like(users.email, `%${input.search}%`))!
        );
      }
      if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
      const items = await query.orderBy(desc(users.createdAt)).limit(input.limit).offset(input.offset);
      const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(users);
      return { items, total: countResult.count };
    }),

  updateRole: adminProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
    .mutation(async ({ input }) => {
      const db = requireDb(await getDb());
      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      return { success: true };
    }),
});

// ─── Categories ──────────────────────────────────────────────────────────────
const categoriesRouter = router({
  list: adminProcedure.query(async () => {
    const db = requireDb(await getDb());
    return db.select().from(categories).orderBy(asc(categories.sortOrder));
  }),

  create: adminProcedure
    .input(
      z.object({
        slug: z.string().min(1).max(64),
        name: z.string().min(1).max(100),
        icon: z.string().min(1).max(10),
        searchQuery: z.string().min(1).max(200),
        sortOrder: z.number().default(0),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const db = requireDb(await getDb());
      await db.insert(categories).values(input);
      return { success: true };
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        slug: z.string().min(1).max(64).optional(),
        name: z.string().min(1).max(100).optional(),
        icon: z.string().min(1).max(10).optional(),
        searchQuery: z.string().min(1).max(200).optional(),
        sortOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = requireDb(await getDb());
      const { id, ...data } = input;
      await db.update(categories).set(data).where(eq(categories.id, id));
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = requireDb(await getDb());
      await db.delete(categories).where(eq(categories.id, input.id));
      return { success: true };
    }),

  reorder: adminProcedure
    .input(z.array(z.object({ id: z.number(), sortOrder: z.number() })))
    .mutation(async ({ input }) => {
      const db = requireDb(await getDb());
      for (const item of input) {
        await db.update(categories).set({ sortOrder: item.sortOrder }).where(eq(categories.id, item.id));
      }
      return { success: true };
    }),
});

// ─── Curated Content ─────────────────────────────────────────────────────────
const curatedRouter = router({
  list: adminProcedure
    .input(z.object({ categorySlug: z.string().optional() }))
    .query(async ({ input }) => {
      const db = requireDb(await getDb());
      let query = db.select().from(curatedContent);
      if (input.categorySlug) {
        query = query.where(eq(curatedContent.categorySlug, input.categorySlug)) as typeof query;
      }
      return query.orderBy(asc(curatedContent.sortOrder));
    }),

  create: adminProcedure
    .input(
      z.object({
        categorySlug: z.string(),
        videoId: z.string(),
        title: z.string(),
        channelName: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        duration: z.string().optional(),
        description: z.string().optional(),
        sortOrder: z.number().default(0),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = requireDb(await getDb());
      await db.insert(curatedContent).values({ ...input, addedBy: ctx.user.id });
      return { success: true };
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        categorySlug: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = requireDb(await getDb());
      const { id, ...data } = input;
      await db.update(curatedContent).set(data).where(eq(curatedContent.id, id));
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = requireDb(await getDb());
      await db.delete(curatedContent).where(eq(curatedContent.id, input.id));
      return { success: true };
    }),

  searchYouTube: adminProcedure
    .input(z.object({ query: z.string(), maxResults: z.number().default(10) }))
    .query(({ input }) => searchVideos(input.query, input.maxResults)),
});

// ─── App Config ──────────────────────────────────────────────────────────────
const configAdminRouter = router({
  list: adminProcedure.query(async () => {
    const db = requireDb(await getDb());
    return db.select().from(appConfig);
  }),

  get: adminProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const db = requireDb(await getDb());
      const result = await db.select().from(appConfig).where(eq(appConfig.configKey, input.key)).limit(1);
      return result[0] ?? null;
    }),

  update: adminProcedure
    .input(z.object({ key: z.string().min(1).max(128), value: z.string().max(10000), description: z.string().max(500).optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = requireDb(await getDb());
      await db
        .insert(appConfig)
        .values({
          configKey: input.key,
          configValue: input.value,
          description: input.description,
          updatedBy: ctx.user.id,
        })
        .onConflictDoUpdate({
          target: appConfig.configKey,
          set: {
            configValue: input.value,
            description: input.description,
            updatedBy: ctx.user.id,
          },
        });
      return { success: true };
    }),
});

// ─── Announcements ───────────────────────────────────────────────────────────
const announcementsRouter = router({
  list: adminProcedure.query(async () => {
    const db = requireDb(await getDb());
    return db.select().from(announcements).orderBy(desc(announcements.createdAt));
  }),

  create: adminProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        content: z.string().min(1),
        type: z.enum(["info", "warning", "urgent"]).default("info"),
        isActive: z.boolean().default(true),
        startAt: z.string().datetime().optional(),
        endAt: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = requireDb(await getDb());
      await db.insert(announcements).values({
        ...input,
        startAt: input.startAt ? new Date(input.startAt) : null,
        endAt: input.endAt ? new Date(input.endAt) : null,
        createdBy: ctx.user.id,
      });
      return { success: true };
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(200).optional(),
        content: z.string().optional(),
        type: z.enum(["info", "warning", "urgent"]).optional(),
        isActive: z.boolean().optional(),
        startAt: z.string().datetime().nullable().optional(),
        endAt: z.string().datetime().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = requireDb(await getDb());
      const { id, startAt, endAt, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (startAt !== undefined) data.startAt = startAt ? new Date(startAt) : null;
      if (endAt !== undefined) data.endAt = endAt ? new Date(endAt) : null;
      await db.update(announcements).set(data).where(eq(announcements.id, id));
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = requireDb(await getDb());
      await db.delete(announcements).where(eq(announcements.id, input.id));
      return { success: true };
    }),
});

// ─── Analytics ───────────────────────────────────────────────────────────────
const analyticsRouter = router({
  overview: adminProcedure.query(async () => {
    const db = requireDb(await getDb());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [todaySearches] = await db
      .select({ count: sql<number>`count(*)` })
      .from(searchLogs)
      .where(gte(searchLogs.createdAt, today));
    const [totalBookmarks] = await db.select({ count: sql<number>`count(*)` }).from(bookmarks);
    const [activeAnnouncements] = await db
      .select({ count: sql<number>`count(*)` })
      .from(announcements)
      .where(eq(announcements.isActive, true));

    return {
      totalUsers: totalUsers.count,
      todaySearches: todaySearches.count,
      totalBookmarks: totalBookmarks.count,
      activeAnnouncements: activeAnnouncements.count,
    };
  }),

  searchLogs: adminProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).default(30),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      const db = requireDb(await getDb());
      const since = new Date();
      since.setDate(since.getDate() - input.days);

      // Daily search counts
      const dailyCounts = await db
        .select({
          date: sql<string>`DATE(${searchLogs.createdAt})`,
          count: sql<number>`count(*)`,
          voiceCount: sql<number>`SUM(CASE WHEN ${searchLogs.source} = 'voice' THEN 1 ELSE 0 END)`,
          textCount: sql<number>`SUM(CASE WHEN ${searchLogs.source} = 'text' THEN 1 ELSE 0 END)`,
        })
        .from(searchLogs)
        .where(gte(searchLogs.createdAt, since))
        .groupBy(sql`DATE(${searchLogs.createdAt})`)
        .orderBy(sql`DATE(${searchLogs.createdAt})`);

      // Top queries
      const topQueries = await db
        .select({
          query: searchLogs.query,
          count: sql<number>`count(*)`,
        })
        .from(searchLogs)
        .where(gte(searchLogs.createdAt, since))
        .groupBy(searchLogs.query)
        .orderBy(desc(sql`count(*)`))
        .limit(input.limit);

      return { dailyCounts, topQueries };
    }),

  userActivity: adminProcedure
    .input(z.object({ days: z.number().min(1).max(90).default(30) }))
    .query(async ({ input }) => {
      const db = requireDb(await getDb());
      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const signups = await db
        .select({
          date: sql<string>`DATE(${users.createdAt})`,
          count: sql<number>`count(*)`,
        })
        .from(users)
        .where(gte(users.createdAt, since))
        .groupBy(sql`DATE(${users.createdAt})`)
        .orderBy(sql`DATE(${users.createdAt})`);

      return { signups };
    }),

  popularContent: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ input }) => {
      const db = requireDb(await getDb());

      const topBookmarked = await db
        .select({
          videoId: bookmarks.videoId,
          title: bookmarks.title,
          count: sql<number>`count(*)`,
        })
        .from(bookmarks)
        .groupBy(bookmarks.videoId, bookmarks.title)
        .orderBy(desc(sql`count(*)`))
        .limit(input.limit);

      const topPlayed = await db
        .select({
          videoId: listeningHistory.videoId,
          title: listeningHistory.title,
          count: sql<number>`count(*)`,
        })
        .from(listeningHistory)
        .groupBy(listeningHistory.videoId, listeningHistory.title)
        .orderBy(desc(sql`count(*)`))
        .limit(input.limit);

      return { topBookmarked, topPlayed };
    }),
});

// ─── Combined Admin Router ──────────────────────────────────────────────────
export const adminRouter = router({
  users: usersRouter,
  categories: categoriesRouter,
  curated: curatedRouter,
  config: configAdminRouter,
  announcements: announcementsRouter,
  analytics: analyticsRouter,
});
