import { asc, count, eq } from "drizzle-orm";

import { db } from "@/core/database/client";

import type { DataRow, NewDataRow } from "./models";
import { dataRows } from "./models";

const BATCH_SIZE = 500;

/**
 * Batch-insert rows for a data source.
 * Splits into chunks of BATCH_SIZE to avoid hitting query size limits.
 */
export async function batchInsert(rows: NewDataRow[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db.insert(dataRows).values(batch);
  }
}

/**
 * Get paginated rows for a data source, ordered by row_number.
 */
export async function findByDataSourceId(
  dataSourceId: string,
  options?: { limit?: number; offset?: number },
): Promise<DataRow[]> {
  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;

  return db
    .select()
    .from(dataRows)
    .where(eq(dataRows.dataSourceId, dataSourceId))
    .orderBy(asc(dataRows.rowNumber))
    .limit(limit)
    .offset(offset);
}

/**
 * Get the first N rows — used to build AI context.
 */
export async function findSample(dataSourceId: string, limit = 50): Promise<DataRow[]> {
  return db
    .select()
    .from(dataRows)
    .where(eq(dataRows.dataSourceId, dataSourceId))
    .orderBy(asc(dataRows.rowNumber))
    .limit(limit);
}

/**
 * Count total rows for a data source.
 */
export async function countByDataSourceId(dataSourceId: string): Promise<number> {
  const results = await db
    .select({ count: count() })
    .from(dataRows)
    .where(eq(dataRows.dataSourceId, dataSourceId));
  return results[0]?.count ?? 0;
}

/**
 * Delete all rows for a data source (used on re-ingestion or cleanup).
 */
export async function deleteByDataSourceId(dataSourceId: string): Promise<void> {
  await db.delete(dataRows).where(eq(dataRows.dataSourceId, dataSourceId));
}
