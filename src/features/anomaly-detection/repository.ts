import { desc, eq } from "drizzle-orm";

import { db } from "@/core/database/client";

import type { AnomalyAlert, NewAnomalyAlert } from "./models";
import { anomalyAlerts } from "./models";

export async function createMany(data: NewAnomalyAlert[]): Promise<AnomalyAlert[]> {
  if (data.length === 0) {
    return [];
  }
  return db.insert(anomalyAlerts).values(data).returning();
}

export async function findByProjectId(projectId: string): Promise<AnomalyAlert[]> {
  return db
    .select()
    .from(anomalyAlerts)
    .where(eq(anomalyAlerts.projectId, projectId))
    .orderBy(desc(anomalyAlerts.createdAt));
}
