import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { transcribeAudio } from "./_core/voiceTranscription";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { searchLogs } from "../drizzle/schema";

export const voiceRouter = router({
  transcribe: protectedProcedure
    .input(
      z.object({
        audioUrl: z.string().url(),
        language: z.string().optional(),
        prompt: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await transcribeAudio(input);

      if ("error" in result) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error,
          cause: result,
        });
      }

      // Log to search_logs
      const db = await getDb();
      if (db && result.text) {
        await db.insert(searchLogs).values({
          userId: ctx.user.id,
          query: result.text,
          resultCount: 0,
          source: "voice",
        });
      }

      return result;
    }),
});
