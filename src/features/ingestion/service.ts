import { getLogger } from "@/core/logging";
import type { DataSourceMetadata, DataSourceType } from "@/features/data-sources";

import type { DataRow } from "./models";
import { parseContent } from "./parser";
import * as repository from "./repository";

const logger = getLogger("ingestion.service");

export interface IngestResult {
  rowCount: number;
  metadata: DataSourceMetadata;
}

/**
 * Parse file content and persist all rows to the database.
 *
 * Called by the data-sources service immediately after a file is uploaded.
 * Returns metadata (columns, counts) to be stored on the data source record.
 *
 * On parse failure the error propagates — the caller is responsible for
 * updating the data source status to "error".
 */
export async function ingestDataSource(
  dataSourceId: string,
  content: string,
  type: DataSourceType,
): Promise<IngestResult> {
  logger.info({ dataSourceId, type }, "ingestion.ingest_started");

  const parsed = parseContent(content, type);

  const newRows = parsed.rows.map((row) => ({
    dataSourceId,
    rowNumber: row.rowNumber,
    data: row.data,
  }));

  await repository.batchInsert(newRows);

  const metadata: DataSourceMetadata =
    type === "text"
      ? { lineCount: parsed.rowCount }
      : { columns: parsed.columns, rowCount: parsed.rowCount };

  logger.info({ dataSourceId, rowCount: parsed.rowCount }, "ingestion.ingest_completed");

  return { rowCount: parsed.rowCount, metadata };
}

/**
 * Get paginated rows for a data source.
 */
export async function getRows(
  dataSourceId: string,
  options?: { limit?: number; offset?: number },
): Promise<DataRow[]> {
  return repository.findByDataSourceId(dataSourceId, options);
}

/**
 * Get a sample of rows — used to build AI query context.
 * Defaults to the first 50 rows.
 */
export async function getSampleRows(dataSourceId: string, limit = 50): Promise<DataRow[]> {
  return repository.findSample(dataSourceId, limit);
}

/**
 * Delete all rows for a data source (called on re-ingestion or source deletion).
 * The CASCADE on the FK handles this automatically when the source is deleted,
 * but this is useful for explicit re-ingestion.
 */
export async function deleteRows(dataSourceId: string): Promise<void> {
  logger.info({ dataSourceId }, "ingestion.delete_started");
  await repository.deleteByDataSourceId(dataSourceId);
  logger.info({ dataSourceId }, "ingestion.delete_completed");
}
