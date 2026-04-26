import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/core/database/client";

import type { Conversation, Message, NewConversation, NewMessage } from "./models";
import { conversations, messages } from "./models";

// ── Conversations ─────────────────────────────────────────────────────────────

export async function findConversationById(id: string): Promise<Conversation | undefined> {
  const results = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  return results[0];
}

export async function findConversationsByProject(projectId: string): Promise<Conversation[]> {
  return db
    .select()
    .from(conversations)
    .where(eq(conversations.projectId, projectId))
    .orderBy(desc(conversations.updatedAt));
}

export async function createConversation(data: NewConversation): Promise<Conversation> {
  const results = await db.insert(conversations).values(data).returning();
  const conv = results[0];
  if (!conv) {
    throw new Error("Failed to create conversation");
  }
  return conv;
}

export async function touchConversation(id: string): Promise<void> {
  await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, id));
}

export async function deleteConversation(id: string): Promise<boolean> {
  const results = await db.delete(conversations).where(eq(conversations.id, id)).returning();
  return results.length > 0;
}

// ── Messages ──────────────────────────────────────────────────────────────────

export async function findMessagesByConversation(conversationId: string): Promise<Message[]> {
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
}

export async function createMessage(data: NewMessage): Promise<Message> {
  const results = await db.insert(messages).values(data).returning();
  const msg = results[0];
  if (!msg) {
    throw new Error("Failed to create message");
  }
  return msg;
}
