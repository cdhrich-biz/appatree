import { relations } from "drizzle-orm";
import {
  users,
  userPreferences,
  bookmarks,
  listeningHistory,
  searchLogs,
  chatSessions,
  chatMessages,
  curatedContent,
  announcements,
} from "./schema";

export const usersRelations = relations(users, ({ one, many }) => ({
  preferences: one(userPreferences, { fields: [users.id], references: [userPreferences.userId] }),
  bookmarks: many(bookmarks),
  listeningHistory: many(listeningHistory),
  searchLogs: many(searchLogs),
  chatSessions: many(chatSessions),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, { fields: [userPreferences.userId], references: [users.id] }),
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(users, { fields: [bookmarks.userId], references: [users.id] }),
}));

export const listeningHistoryRelations = relations(listeningHistory, ({ one }) => ({
  user: one(users, { fields: [listeningHistory.userId], references: [users.id] }),
}));

export const searchLogsRelations = relations(searchLogs, ({ one }) => ({
  user: one(users, { fields: [searchLogs.userId], references: [users.id] }),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, { fields: [chatSessions.userId], references: [users.id] }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, { fields: [chatMessages.sessionId], references: [chatSessions.id] }),
}));

export const curatedContentRelations = relations(curatedContent, ({ one }) => ({
  addedByUser: one(users, { fields: [curatedContent.addedBy], references: [users.id] }),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  createdByUser: one(users, { fields: [announcements.createdBy], references: [users.id] }),
}));
