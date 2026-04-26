import { getLogger } from "@/core/logging";
import { deleteFile, uploadFile } from "@/core/storage";
import { scanAndStoreAnomalies } from "@/features/anomaly-detection";
import { getSampleRows, ingestDataSource } from "@/features/ingestion";
import { getProject } from "@/features/projects";
import { generateSuggestedQuestions } from "@/features/suggested-questions";

import {
  DataSourceAccessDeniedError,
  DataSourceFileTooLargeError,
  DataSourceInvalidFileTypeError,
  DataSourceNotFoundError,
  DataSourceUploadFailedError,
} from "./errors";
import type { DataSource, DataSourceType } from "./models";
import * as repository from "./repository";
import type { CreateDataSourceInput } from "./schemas";
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES } from "./schemas";

const logger = getLogger("data-sources.service");

const EXTENSION_TO_TYPE: Record<string, DataSourceType> = {
  ".csv": "csv",
  ".json": "json",
  ".txt": "text",
};

/**
 * Determine file type from filename extension.
 */
function resolveFileType(filename: string): DataSourceType {
  const lower = filename.toLowerCase();
  for (const ext of ALLOWED_EXTENSIONS) {
    if (lower.endsWith(ext)) {
      const type = EXTENSION_TO_TYPE[ext];
      if (type) {
        return type;
      }
    }
  }
  throw new DataSourceInvalidFileTypeError(filename);
}

/**
 * Upload a file, create a data source record, and ingest its rows.
 *
 * Flow:
 *   1. Validate ownership, file type, and size
 *   2. Upload raw file to Supabase Storage
 *   3. Create DB record with status "processing"
 *   4. Parse content and insert rows via the ingestion pipeline
 *   5. Update status to "ready" (or "error" if parsing failed)
 */
export async function createDataSource(
  input: CreateDataSourceInput,
  file: File,
  projectId: string,
  userId: string,
): Promise<DataSource> {
  logger.info({ projectId, userId, name: input.name }, "data_source.create_started");

  // Verify project exists and user is the owner
  const project = await getProject(projectId, userId);
  if (project.ownerId !== userId) {
    throw new DataSourceAccessDeniedError(projectId);
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new DataSourceFileTooLargeError(MAX_FILE_SIZE_BYTES / (1024 * 1024));
  }

  // Validate file type by extension
  const type = resolveFileType(file.name);

  // Generate a stable ID before storage so the key includes the ID
  const id = crypto.randomUUID();
  const storageKey = `${projectId}/${id}/${file.name}`;

  // Upload to Supabase Storage
  try {
    await uploadFile(storageKey, file, file.type || "application/octet-stream");
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    logger.error({ projectId, storageKey, cause }, "data_source.upload_failed");
    throw new DataSourceUploadFailedError(cause);
  }

  // Create the DB record immediately with "processing" status
  const source = await repository.create({
    id,
    projectId,
    name: input.name,
    type,
    storageKey,
    fileSize: file.size,
    rowCount: null,
    status: "processing",
    errorMessage: null,
    metadata: null,
  });

  // Ingest: parse content and persist rows (use source.id, not the local UUID,
  // so that callers always reference the canonical DB identifier)
  let updated: DataSource | undefined;
  let ingestedContent = "";
  try {
    ingestedContent = await file.text();
    const result = await ingestDataSource(source.id, ingestedContent, type);
    updated = await repository.updateStatus(source.id, "ready", {
      rowCount: result.rowCount,
      metadata: result.metadata,
    });

    // Non-fatal post-processing: generate suggested questions + anomaly scan
    const meta = result.metadata as { columns?: string[] } | null;
    const columns = meta?.columns ?? [];
    if (columns.length > 0) {
      const sampleRows = await getSampleRows(source.id, 20);
      const sampleValues: Record<string, string[]> = {};
      for (const col of columns) {
        sampleValues[col] = sampleRows
          .map((r) => String((r.data as Record<string, unknown>)[col] ?? ""))
          .filter((v) => v !== "")
          .slice(0, 5);
      }
      void generateSuggestedQuestions(source.id, input.name, columns, sampleValues);
      const rowData = sampleRows.map((r) => r.data as Record<string, unknown>);
      void scanAndStoreAnomalies(source.id, projectId, rowData);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ dataSourceId: source.id, cause: msg }, "data_source.ingest_failed");
    updated = await repository.updateStatus(source.id, "error", { errorMessage: msg });
  }

  const final = updated ?? source;
  logger.info(
    { projectId, dataSourceId: id, type, status: final.status },
    "data_source.create_completed",
  );
  return final;
}

/**
 * List all data sources for a project.
 * The caller must be able to access the parent project.
 */
export async function listDataSources(projectId: string, userId: string): Promise<DataSource[]> {
  logger.info({ projectId, userId }, "data_source.list_started");

  await getProject(projectId, userId);

  const sources = await repository.findByProjectId(projectId);

  logger.info({ projectId, count: sources.length }, "data_source.list_completed");
  return sources;
}

/**
 * Get a single data source by ID.
 * Verifies the source belongs to a project the user can access.
 */
export async function getDataSource(id: string, userId: string): Promise<DataSource> {
  logger.info({ dataSourceId: id, userId }, "data_source.get_started");

  const source = await repository.findById(id);
  if (!source) {
    logger.warn({ dataSourceId: id }, "data_source.get_failed");
    throw new DataSourceNotFoundError(id);
  }

  await getProject(source.projectId, userId);

  logger.info({ dataSourceId: id }, "data_source.get_completed");
  return source;
}

/**
 * Delete a data source and its file from storage.
 * Only the project owner can delete.
 * Rows are removed automatically via the FK CASCADE.
 */
export async function deleteDataSource(id: string, userId: string): Promise<void> {
  logger.info({ dataSourceId: id, userId }, "data_source.delete_started");

  const source = await repository.findById(id);
  if (!source) {
    logger.warn({ dataSourceId: id }, "data_source.delete_failed");
    throw new DataSourceNotFoundError(id);
  }

  const project = await getProject(source.projectId, userId);
  if (project.ownerId !== userId) {
    throw new DataSourceAccessDeniedError(id);
  }

  // Best-effort storage delete — log but don't fail if the file is already gone
  try {
    await deleteFile(source.storageKey);
  } catch (err) {
    logger.warn(
      { dataSourceId: id, storageKey: source.storageKey, err },
      "data_source.storage_delete_failed",
    );
  }

  await repository.deleteById(id);

  logger.info({ dataSourceId: id }, "data_source.delete_completed");
}
