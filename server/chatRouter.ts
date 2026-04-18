import { z } from "zod";
import { eq, and, desc, asc } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { chatSessions, chatMessages, appConfig } from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import { TRPCError } from "@trpc/server";
import type { Message } from "./_core/llm";

function requireDb(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return db;
}

const DEFAULT_SYSTEM_PROMPT = `당신은 시니어 사용자를 위한 오디오북 추천 도우미입니다.
- 항상 한국어로 대화하세요.
- 친절하고 쉬운 말을 사용하세요.
- 오디오북과 책을 추천할 때 제목, 저자, 간단한 설명을 포함하세요.
- 추천할 때 다음 JSON 형식의 블록을 포함하세요:
  [RECOMMEND]{"title":"책 제목","author":"저자","description":"설명","searchQuery":"YouTube 검색어"}[/RECOMMEND]
- 사용자의 취향과 관심사를 파악하여 맞춤 추천을 해주세요.`;

const DEFAULT_GREETING = "안녕하세요! 저는 당신의 오디오북 추천 도우미입니다. 어떤 책을 찾고 계신가요?";
const MAX_HISTORY_TURNS = 10;

async function getConfigValue(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, key: string, fallback: string): Promise<string> {
  const result = await db.select({ configValue: appConfig.configValue }).from(appConfig).where(eq(appConfig.configKey, key)).limit(1);
  return result.length > 0 ? result[0].configValue : fallback;
}

export const chatRouter = router({
  send: protectedProcedure
    .input(z.object({ sessionId: z.number().int().positive().optional(), message: z.string().min(1).max(1000) }))
    .mutation(async ({ input, ctx }) => {
      const db = requireDb(await getDb());

      // Get or create session
      let sessionId = input.sessionId;
      if (!sessionId) {
        const title = input.message.slice(0, 50) + (input.message.length > 50 ? "..." : "");
        const [inserted] = await db.insert(chatSessions).values({ userId: ctx.user.id, title }).returning({ id: chatSessions.id });
        sessionId = inserted.id;
      } else {
        // Verify ownership
        const session = await db.select({ userId: chatSessions.userId }).from(chatSessions).where(eq(chatSessions.id, sessionId)).limit(1);
        if (session.length === 0 || session[0].userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
        }
      }

      // Save user message
      await db.insert(chatMessages).values({ sessionId, role: "user", content: input.message });

      // Load config
      const systemPrompt = await getConfigValue(db, "ai.systemPrompt", DEFAULT_SYSTEM_PROMPT);
      const temperatureStr = await getConfigValue(db, "ai.temperature", "0.7");
      const maxTokensStr = await getConfigValue(db, "ai.maxTokens", "2048");

      // Load recent conversation history
      const history = await db
        .select({ role: chatMessages.role, content: chatMessages.content })
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, sessionId))
        .orderBy(desc(chatMessages.createdAt))
        .limit(MAX_HISTORY_TURNS * 2);

      // Build messages for LLM
      const messages: Message[] = [
        { role: "system", content: systemPrompt },
        ...history.reverse().map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      // Call LLM
      const result = await invokeLLM({
        messages,
        maxTokens: parseInt(maxTokensStr, 10),
      });

      const assistantContent =
        typeof result.choices[0]?.message?.content === "string"
          ? result.choices[0].message.content
          : Array.isArray(result.choices[0]?.message?.content)
            ? result.choices[0].message.content
                .filter((p): p is { type: "text"; text: string } => p.type === "text")
                .map((p) => p.text)
                .join("")
            : "";

      // Save assistant message
      await db.insert(chatMessages).values({ sessionId, role: "assistant", content: assistantContent });

      return {
        sessionId,
        message: assistantContent,
      };
    }),

  sessions: protectedProcedure.query(async ({ ctx }) => {
    const db = requireDb(await getDb());
    return db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, ctx.user.id))
      .orderBy(desc(chatSessions.updatedAt));
  }),

  history: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = requireDb(await getDb());
      // Verify ownership
      const session = await db.select({ userId: chatSessions.userId }).from(chatSessions).where(eq(chatSessions.id, input.sessionId)).limit(1);
      if (session.length === 0 || session[0].userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }
      return db.select().from(chatMessages).where(eq(chatMessages.sessionId, input.sessionId)).orderBy(asc(chatMessages.createdAt));
    }),

  deleteSession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = requireDb(await getDb());
      const session = await db.select({ userId: chatSessions.userId }).from(chatSessions).where(eq(chatSessions.id, input.sessionId)).limit(1);
      if (session.length === 0 || session[0].userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }
      await db.delete(chatMessages).where(eq(chatMessages.sessionId, input.sessionId));
      await db.delete(chatSessions).where(eq(chatSessions.id, input.sessionId));
      return { success: true };
    }),

  greeting: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return DEFAULT_GREETING;
    return getConfigValue(db, "ai.greetingMessage", DEFAULT_GREETING);
  }),
});
