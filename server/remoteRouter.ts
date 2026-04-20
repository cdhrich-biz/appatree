import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, isNull, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  familyRelations,
  inviteCodes,
  remoteActions,
  remoteSessions,
  users,
} from "../drizzle/schema";
import { channelForSession, channelForUser } from "@shared/remoteEvents";
import { issueAblySessionToken, issueAblyUserToken, publishToChannel } from "./_core/ably";
import { checkRateLimit } from "./_core/rateLimit";
import { getIceServers } from "./_core/turn";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";

const INVITE_TTL_MS = 10 * 60 * 1000;
const SESSION_REQUEST_TIMEOUT_MS = 45 * 1000;

function requireDb(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return db;
}

function generate6DigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function findMemberSession(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  sessionKey: string,
  userId: number,
) {
  const rows = await db
    .select()
    .from(remoteSessions)
    .where(
      and(
        eq(remoteSessions.sessionKey, sessionKey),
        or(
          eq(remoteSessions.parentUserId, userId),
          eq(remoteSessions.childUserId, userId),
        ),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export const remoteRouter = router({
  // ─── Invite Codes ────────────────────────────────────────────────────────
  createInvite: protectedProcedure.mutation(async ({ ctx }) => {
    const db = requireDb(await getDb());

    const rate = checkRateLimit(`invite:create:${ctx.user.id}`, { limit: 5, windowMs: 10 * 60 * 1000 });
    if (!rate.ok) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `초대 코드는 10분 안에 너무 많이 만들 수 없어요. 잠시 후 다시 시도해주세요.`,
      });
    }

    // 유효한 미소비 코드가 있으면 재사용
    const existing = await db
      .select()
      .from(inviteCodes)
      .where(
        and(
          eq(inviteCodes.parentUserId, ctx.user.id),
          isNull(inviteCodes.consumedAt),
          gte(inviteCodes.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(inviteCodes.createdAt))
      .limit(1);
    if (existing[0]) return existing[0];

    // 충돌 방지를 위해 최대 5번 재시도
    for (let i = 0; i < 5; i++) {
      const code = generate6DigitCode();
      try {
        const [row] = await db
          .insert(inviteCodes)
          .values({
            code,
            parentUserId: ctx.user.id,
            expiresAt: new Date(Date.now() + INVITE_TTL_MS),
          })
          .returning();
        return row;
      } catch {
        // unique violation — 재시도
      }
    }
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "초대 코드 생성 실패" });
  }),

  acceptInvite: protectedProcedure
    .input(z.object({ code: z.string().length(6).regex(/^\d+$/) }))
    .mutation(async ({ ctx, input }) => {
      const db = requireDb(await getDb());

      // 브루트포스 방어: 유저당 1분에 10회 초과 시 차단
      const rate = checkRateLimit(`invite:accept:${ctx.user.id}`, { limit: 10, windowMs: 60 * 1000 });
      if (!rate.ok) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "코드 입력을 너무 많이 시도했어요. 1분 후 다시 시도해주세요.",
        });
      }

      const [invite] = await db
        .select()
        .from(inviteCodes)
        .where(eq(inviteCodes.code, input.code))
        .limit(1);

      if (!invite) {
        throw new TRPCError({ code: "NOT_FOUND", message: "유효하지 않은 코드입니다" });
      }
      if (invite.consumedAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "이미 사용된 코드입니다" });
      }
      if (invite.expiresAt < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "만료된 코드입니다" });
      }
      if (invite.parentUserId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "본인 코드는 사용할 수 없습니다" });
      }

      const [relation] = await db
        .insert(familyRelations)
        .values({
          parentUserId: invite.parentUserId,
          childUserId: ctx.user.id,
          status: "verified",
          verifiedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [familyRelations.parentUserId, familyRelations.childUserId],
          set: { status: "verified", verifiedAt: new Date(), revokedAt: null },
        })
        .returning();

      await db
        .update(inviteCodes)
        .set({ consumedBy: ctx.user.id, consumedAt: new Date() })
        .where(eq(inviteCodes.id, invite.id));

      return relation;
    }),

  // ─── Relations ───────────────────────────────────────────────────────────
  listRelations: protectedProcedure.query(async ({ ctx }) => {
    const db = requireDb(await getDb());
    const rows = await db
      .select({
        relation: familyRelations,
        parent: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(familyRelations)
      .leftJoin(
        users,
        eq(
          users.id,
          // 본인이 parent면 child 이름을, child면 parent 이름을 가져오도록
          sql`CASE WHEN ${familyRelations.parentUserId} = ${ctx.user.id}
               THEN ${familyRelations.childUserId}
               ELSE ${familyRelations.parentUserId} END`,
        ),
      )
      .where(
        and(
          or(
            eq(familyRelations.parentUserId, ctx.user.id),
            eq(familyRelations.childUserId, ctx.user.id),
          ),
          eq(familyRelations.status, "verified"),
        ),
      );

    return rows.map((row) => ({
      ...row.relation,
      role: row.relation.parentUserId === ctx.user.id ? ("parent" as const) : ("child" as const),
      counterpart: row.parent,
    }));
  }),

  revokeRelation: protectedProcedure
    .input(z.object({ relationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = requireDb(await getDb());
      await db
        .update(familyRelations)
        .set({ status: "revoked", revokedAt: new Date() })
        .where(
          and(
            eq(familyRelations.id, input.relationId),
            or(
              eq(familyRelations.parentUserId, ctx.user.id),
              eq(familyRelations.childUserId, ctx.user.id),
            ),
          ),
        );
      return { success: true } as const;
    }),

  // ─── Session lifecycle ───────────────────────────────────────────────────
  requestSession: protectedProcedure
    .input(z.object({ parentUserId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = requireDb(await getDb());

      const rate = checkRateLimit(`session:request:${ctx.user.id}`, { limit: 10, windowMs: 60 * 1000 });
      if (!rate.ok) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "연결 요청이 너무 잦아요. 잠시 후 다시 시도해주세요.",
        });
      }

      const [rel] = await db
        .select()
        .from(familyRelations)
        .where(
          and(
            eq(familyRelations.parentUserId, input.parentUserId),
            eq(familyRelations.childUserId, ctx.user.id),
            eq(familyRelations.status, "verified"),
          ),
        )
        .limit(1);
      if (!rel) {
        throw new TRPCError({ code: "FORBIDDEN", message: "연결되지 않은 가족입니다" });
      }

      const sessionKey = nanoid(24);
      const [session] = await db
        .insert(remoteSessions)
        .values({
          sessionKey,
          parentUserId: input.parentUserId,
          childUserId: ctx.user.id,
          status: "requested",
        })
        .returning();

      try {
        await publishToChannel(channelForUser(input.parentUserId), "session:request", {
          type: "session:request",
          sessionKey,
          childUserId: ctx.user.id,
          childName: ctx.user.name ?? null,
          requestedAt: Date.now(),
        });
      } catch (error) {
        console.warn("[remote] session:request publish failed", error);
      }

      const ablyToken = await issueAblySessionToken({ userId: ctx.user.id, sessionKey });
      return { session, ablyToken, timeoutMs: SESSION_REQUEST_TIMEOUT_MS };
    }),

  acceptSession: protectedProcedure
    .input(z.object({ sessionKey: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = requireDb(await getDb());
      const session = await findMemberSession(db, input.sessionKey, ctx.user.id);
      if (!session || session.parentUserId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (session.status !== "requested") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "이미 처리된 요청입니다" });
      }

      await db
        .update(remoteSessions)
        .set({ status: "active", acceptedAt: new Date() })
        .where(eq(remoteSessions.id, session.id));

      try {
        await publishToChannel(channelForSession(input.sessionKey), "session:accepted", {
          type: "session:accepted",
          sessionKey: input.sessionKey,
          acceptedAt: Date.now(),
        });
      } catch (error) {
        console.warn("[remote] session:accepted publish failed", error);
      }

      const ablyToken = await issueAblySessionToken({ userId: ctx.user.id, sessionKey: input.sessionKey });
      return { session: { ...session, status: "active" as const }, ablyToken };
    }),

  rejectSession: protectedProcedure
    .input(z.object({ sessionKey: z.string().min(1), reason: z.string().max(50).optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = requireDb(await getDb());
      const session = await findMemberSession(db, input.sessionKey, ctx.user.id);
      if (!session || session.parentUserId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await db
        .update(remoteSessions)
        .set({
          status: "rejected",
          endedAt: new Date(),
          endedBy: ctx.user.id,
          endReason: input.reason ?? "parent_rejected",
        })
        .where(eq(remoteSessions.id, session.id));

      try {
        await publishToChannel(channelForSession(input.sessionKey), "session:rejected", {
          type: "session:rejected",
          sessionKey: input.sessionKey,
        });
      } catch (error) {
        console.warn("[remote] session:rejected publish failed", error);
      }

      return { success: true } as const;
    }),

  endSession: protectedProcedure
    .input(z.object({ sessionKey: z.string().min(1), reason: z.string().max(50).optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = requireDb(await getDb());
      const session = await findMemberSession(db, input.sessionKey, ctx.user.id);
      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (session.status === "ended" || session.status === "rejected") {
        return { success: true } as const;
      }

      await db
        .update(remoteSessions)
        .set({
          status: "ended",
          endedAt: new Date(),
          endedBy: ctx.user.id,
          endReason: input.reason ?? "user_ended",
        })
        .where(eq(remoteSessions.id, session.id));

      try {
        await publishToChannel(channelForSession(input.sessionKey), "session:ended", {
          type: "session:ended",
          sessionKey: input.sessionKey,
          endedBy: ctx.user.id,
          reason: input.reason ?? "user_ended",
        });
      } catch (error) {
        console.warn("[remote] session:ended publish failed", error);
      }

      return { success: true } as const;
    }),

  // ─── Audit log ───────────────────────────────────────────────────────────
  logAction: protectedProcedure
    .input(
      z.object({
        sessionKey: z.string().min(1),
        actionType: z.enum([
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
        ]),
        payload: z.unknown().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = requireDb(await getDb());
      const session = await findMemberSession(db, input.sessionKey, ctx.user.id);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });

      await db.insert(remoteActions).values({
        sessionId: session.id,
        actorUserId: ctx.user.id,
        actionType: input.actionType,
        payload: input.payload !== undefined ? JSON.stringify(input.payload) : null,
      });
      return { success: true } as const;
    }),

  listSessionAudit: protectedProcedure
    .input(z.object({ sessionKey: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const db = requireDb(await getDb());
      const session = await findMemberSession(db, input.sessionKey, ctx.user.id);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });

      const actions = await db
        .select()
        .from(remoteActions)
        .where(eq(remoteActions.sessionId, session.id))
        .orderBy(desc(remoteActions.createdAt))
        .limit(200);
      return { session, actions };
    }),

  // ─── Realtime credentials ────────────────────────────────────────────────
  getIceServers: protectedProcedure.query(async () => {
    return { iceServers: await getIceServers() };
  }),

  getUserChannelToken: protectedProcedure.query(async ({ ctx }) => {
    return issueAblyUserToken({ userId: ctx.user.id });
  }),

  getSessionChannelToken: protectedProcedure
    .input(z.object({ sessionKey: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = requireDb(await getDb());
      const session = await findMemberSession(db, input.sessionKey, ctx.user.id);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      if (session.status !== "active" && session.status !== "requested") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "종료된 세션입니다" });
      }
      return issueAblySessionToken({ userId: ctx.user.id, sessionKey: input.sessionKey });
    }),
});
