import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { searchVideos, getVideoDetails, getChannelDetails, getPlaylistItems } from "./_core/youtube";
import { voiceRouter } from "./voiceRouter";
import { libraryRouter } from "./libraryRouter";
import { chatRouter } from "./chatRouter";
import { preferencesRouter } from "./preferencesRouter";
import { configRouter } from "./configRouter";
import { adminRouter } from "./adminRouter";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  youtube: router({
    search: publicProcedure
      .input(z.object({ query: z.string(), maxResults: z.number().optional(), order: z.string().optional(), pageToken: z.string().optional() }))
      .query(({ input }) => searchVideos(input.query, input.maxResults)),
    video: publicProcedure
      .input(z.object({ videoId: z.string() }))
      .query(({ input }) => getVideoDetails(input.videoId)),
    channel: publicProcedure
      .input(z.object({ channelId: z.string() }))
      .query(({ input }) => getChannelDetails(input.channelId)),
    playlist: publicProcedure
      .input(z.object({ playlistId: z.string(), maxResults: z.number().optional() }))
      .query(({ input }) => getPlaylistItems(input.playlistId, input.maxResults)),
  }),

  voice: voiceRouter,
  library: libraryRouter,
  chat: chatRouter,
  preferences: preferencesRouter,
  config: configRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
