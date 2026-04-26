import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import { dataSources } from "@/core/database/schema";

export { dataSources };

export type DataSource = InferSelectModel<typeof dataSources>;
export type NewDataSource = InferInsertModel<typeof dataSources>;

export type DataSourceType = "csv" | "json" | "text";
export type DataSourceStatus = "processing" | "ready" | "error";

/**
 * Parsed metadata stored in the JSONB column after ingestion.
 */
export interface DataSourceMetadata {
  columns?: string[];
  rowCount?: number;
  lineCount?: number;
  charCount?: number;
}
