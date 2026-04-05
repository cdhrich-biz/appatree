import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { bookmarks, listeningHistory } from "../drizzle/schema";
import { TRPCError } from "@trpc/server";

function requireDb(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return db;
}

export const libraryRouter = router({
  addBookmark: protectedProcedure
    .input(
      z.object({
        videoId: z.string(),
        title: z.string(),
        channelName: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        duration: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = requireDb(await getDb());
      await db
        .insert(bookmarks)
        .values({ userId: ctx.user.id, ...input })
        .onConflictDoUpdate({ target: [bookmarks.userId, bookmarks.videoId], set: { title: input.title } });
      return { success: true };
    }),

  removeBookmark: protectedProcedure
    .input(z.object({ videoId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = requireDb(await getDb());
      await db
        .delete(bookmarks)
        .where(and(eq(bookmarks.userId, ctx.user.id), eq(bookmarks.videoId, input.videoId)));
      return { success: true };
    }),

  bookmarks: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20), offset: z.number().min(0).default(0) }))
    .query(async ({ input, ctx }) => {
      const db = requireDb(await getDb());
      const items = await db
        .select()
        .from(bookmarks)
        .where(eq(bookmarks.userId, ctx.user.id))
        .orderBy(desc(bookmarks.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      return items;
    }),

  isBookmarked: protectedProcedure
    .input(z.object({ videoId: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = requireDb(await getDb());
      const result = await db
        .select({ id: bookmarks.id })
        .from(bookmarks)
        .where(and(eq(bookmarks.userId, ctx.user.id), eq(bookmarks.videoId, input.videoId)))
        .limit(1);
      return result.length > 0;
    }),

  addHistory: protectedProcedure
    .input(
      z.object({
        videoId: z.string(),
        title: z.string(),
        channelName: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        duration: z.string().optional(),
        progressSeconds: z.number().default(0),
        totalSeconds: z.number().default(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = requireDb(await getDb());
      await db
        .insert(listeningHistory)
        .values({ userId: ctx.user.id, ...input, lastPlayedAt: new Date() })
        .onConflictDoUpdate({
          target: [listeningHistory.userId, listeningHistory.videoId],
          set: {
            title: input.title,
            progressSeconds: input.progressSeconds,
            totalSeconds: input.totalSeconds,
            lastPlayedAt: new Date(),
          },
        });
      return { success: true };
    }),

  history: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20), offset: z.number().min(0).default(0) }))
    .query(async ({ input, ctx }) => {
      const db = requireDb(await getDb());
      const items = await db
        .select()
        .from(listeningHistory)
        .where(eq(listeningHistory.userId, ctx.user.id))
        .orderBy(desc(listeningHistory.lastPlayedAt))
        .limit(input.limit)
        .offset(input.offset);
      return items;
    }),

  updateProgress: protectedProcedure
    .input(z.object({ videoId: z.string(), progressSeconds: z.number(), totalSeconds: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = requireDb(await getDb());
      const updateSet: Record<string, unknown> = {
        progressSeconds: input.progressSeconds,
        lastPlayedAt: new Date(),
      };
      if (input.totalSeconds !== undefined) {
        updateSet.totalSeconds = input.totalSeconds;
      }
      await db
        .update(listeningHistory)
        .set(updateSet)
        .where(and(eq(listeningHistory.userId, ctx.user.id), eq(listeningHistory.videoId, input.videoId)));
      return { success: true };
    }),

  clearHistory: protectedProcedure.mutation(async ({ ctx }) => {
    const db = requireDb(await getDb());
    await db.delete(listeningHistory).where(eq(listeningHistory.userId, ctx.user.id));
    return { success: true };
  }),

  clearBookmarks: protectedProcedure.mutation(async ({ ctx }) => {
    const db = requireDb(await getDb());
    await db.delete(bookmarks).where(eq(bookmarks.userId, ctx.user.id));
    return { success: true };
  }),
});
