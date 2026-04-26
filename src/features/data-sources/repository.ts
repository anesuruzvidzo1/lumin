import { and, count, eq } from "drizzle-orm";

import { db } from "@/core/database/client";

import type { DataSource, DataSourceMetadata, DataSourceStatus, NewDataSource } from "./models";
import { dataSources } from "./models";

export async function findById(id: string): Promise<DataSource | undefined> {
  const results = await db.select().from(dataSources).where(eq(dataSources.id, id)).limit(1);
  return results[0];
}

export async function findByProjectId(projectId: string): Promise<DataSource[]> {
  return db
    .select()
    .from(dataSources)
    .where(eq(dataSources.projectId, projectId))
    .orderBy(dataSources.createdAt);
}

export async function findByIdAndProject(
  id: string,
  projectId: string,
): Promise<DataSource | undefined> {
  const results = await db
    .select()
    .from(dataSources)
    .where(and(eq(dataSources.id, id), eq(dataSources.projectId, projectId)))
    .limit(1);
  return results[0];
}

export async function create(data: NewDataSource): Promise<DataSource> {
  const results = await db.insert(dataSources).values(data).returning();
  const source = results[0];
  if (!source) {
    throw new Error("Failed to create data source");
  }
  return source;
}

export async function updateStatus(
  id: string,
  status: DataSourceStatus,
  extra?: {
    rowCount?: number;
    metadata?: DataSourceMetadata;
    errorMessage?: string;
  },
): Promise<DataSource | undefined> {
  const updateData: Partial<DataSource> = { status, updatedAt: new Date() };
  if (extra?.rowCount !== undefined) {
    updateData.rowCount = extra.rowCount;
  }
  if (extra?.metadata !== undefined) {
    updateData.metadata = extra.metadata;
  }
  if (extra?.errorMessage !== undefined) {
    updateData.errorMessage = extra.errorMessage;
  }
  const results = await db
    .update(dataSources)
    .set(updateData)
    .where(eq(dataSources.id, id))
    .returning();
  return results[0];
}

export async function deleteById(id: string): Promise<boolean> {
  const results = await db.delete(dataSources).where(eq(dataSources.id, id)).returning();
  return results.length > 0;
}

export async function countByProjectId(projectId: string): Promise<number> {
  const results = await db
    .select({ count: count() })
    .from(dataSources)
    .where(eq(dataSources.projectId, projectId));
  return results[0]?.count ?? 0;
}
