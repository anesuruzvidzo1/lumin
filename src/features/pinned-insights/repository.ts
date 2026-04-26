import { asc, eq } from "drizzle-orm";

import { db } from "@/core/database/client";

import type { NewPinnedInsight, PinnedInsight } from "./models";
import { pinnedInsights } from "./models";

export async function create(data: NewPinnedInsight): Promise<PinnedInsight> {
  const results = await db.insert(pinnedInsights).values(data).returning();
  const row = results[0];
  if (!row) {
    throw new Error("Failed to pin insight");
  }
  return row;
}

export async function findByProjectId(projectId: string): Promise<PinnedInsight[]> {
  return db
    .select()
    .from(pinnedInsights)
    .where(eq(pinnedInsights.projectId, projectId))
    .orderBy(asc(pinnedInsights.createdAt));
}

export async function findByMessageId(messageId: string): Promise<PinnedInsight | undefined> {
  const results = await db
    .select()
    .from(pinnedInsights)
    .where(eq(pinnedInsights.messageId, messageId))
    .limit(1);
  return results[0];
}

export async function deleteById(id: string): Promise<boolean> {
  const results = await db.delete(pinnedInsights).where(eq(pinnedInsights.id, id)).returning();
  return results.length > 0;
}
