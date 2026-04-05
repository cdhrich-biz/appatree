import { z } from "zod";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { userPreferences } from "../drizzle/schema";
import { TRPCError } from "@trpc/server";

function requireDb(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return db;
}

const DEFAULTS = {
  textSize: "medium" as const,
  volume: 70,
  ttsSpeed: "0.90",
  autoplay: true,
  preferredLanguage: "ko-KR",
  highContrast: false,
  hasSeenOnboarding: false,
};

export const preferencesRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const db = requireDb(await getDb());
    const result = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, ctx.user.id))
      .limit(1);

    if (result.length === 0) {
      return { ...DEFAULTS, userId: ctx.user.id };
    }
    return result[0];
  }),

  update: protectedProcedure
    .input(
      z.object({
        textSize: z.enum(["small", "medium", "large"]).optional(),
        volume: z.number().min(0).max(100).optional(),
        ttsSpeed: z.string().optional(),
        autoplay: z.boolean().optional(),
        preferredLanguage: z.string().optional(),
        highContrast: z.boolean().optional(),
        hasSeenOnboarding: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = requireDb(await getDb());
      const existing = await db
        .select({ id: userPreferences.id })
        .from(userPreferences)
        .where(eq(userPreferences.userId, ctx.user.id))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(userPreferences).values({
          userId: ctx.user.id,
          ...DEFAULTS,
          ...input,
        });
      } else {
        await db
          .update(userPreferences)
          .set(input)
          .where(eq(userPreferences.userId, ctx.user.id));
      }

      return { success: true };
    }),
});
