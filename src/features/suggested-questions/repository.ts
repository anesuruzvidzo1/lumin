import { eq, inArray } from "drizzle-orm";

import { db } from "@/core/database/client";

import type { NewSuggestedQuestion, SuggestedQuestion } from "./models";
import { suggestedQuestions } from "./models";

export async function create(data: NewSuggestedQuestion): Promise<SuggestedQuestion> {
  const results = await db.insert(suggestedQuestions).values(data).returning();
  const row = results[0];
  if (!row) {
    throw new Error("Failed to create suggested questions");
  }
  return row;
}

export async function findByDataSourceId(
  dataSourceId: string,
): Promise<SuggestedQuestion | undefined> {
  const results = await db
    .select()
    .from(suggestedQuestions)
    .where(eq(suggestedQuestions.dataSourceId, dataSourceId))
    .limit(1);
  return results[0];
}

export async function findByDataSourceIds(dataSourceIds: string[]): Promise<SuggestedQuestion[]> {
  if (dataSourceIds.length === 0) {
    return [];
  }
  return db
    .select()
    .from(suggestedQuestions)
    .where(inArray(suggestedQuestions.dataSourceId, dataSourceIds));
}
