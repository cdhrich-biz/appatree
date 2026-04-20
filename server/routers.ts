import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { searchVideos, getVideoDetails, getVideoDetailsBatch, getChannelDetails, getPlaylistItems } from "./_core/youtube";
import { voiceRouter } from "./voiceRouter";
import { libraryRouter } from "./libraryRouter";
import { chatRouter } from "./chatRouter";
import { preferencesRouter } from "./preferencesRouter";
import { configRouter } from "./configRouter";
import { adminRouter } from "./adminRouter";
import { remoteRouter } from "./remoteRouter";

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
      .input(z.object({ query: z.string().min(1).max(120), maxResults: z.number().int().min(1).max(50).optional(), order: z.string().max(32).optional(), pageToken: z.string().max(128).optional() }))
      .query(({ input }) => searchVideos(input.query, input.maxResults, undefined, undefined, input.order, input.pageToken)),
    videosBatch: publicProcedure
      .input(z.object({ videoIds: z.array(z.string().min(1).max(32)).max(50) }))
      .query(({ input }) => getVideoDetailsBatch(input.videoIds)),
    video: publicProcedure
      .input(z.object({ videoId: z.string().min(1).max(32) }))
      .query(({ input }) => getVideoDetails(input.videoId)),
    channel: publicProcedure
      .input(z.object({ channelId: z.string().min(1).max(64) }))
      .query(({ input }) => getChannelDetails(input.channelId)),
    playlist: publicProcedure
      .input(z.object({ playlistId: z.string().min(1).max(64), maxResults: z.number().int().min(1).max(50).optional() }))
      .query(({ input }) => getPlaylistItems(input.playlistId, input.maxResults)),
  }),

  voice: voiceRouter,
  library: libraryRouter,
  chat: chatRouter,
  preferences: preferencesRouter,
  config: configRouter,
  admin: adminRouter,
  remote: remoteRouter,
});

export type AppRouter = typeof appRouter;
