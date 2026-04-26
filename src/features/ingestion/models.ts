import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import { dataRows } from "@/core/database/schema";

export { dataRows };

export type DataRow = InferSelectModel<typeof dataRows>;
export type NewDataRow = InferInsertModel<typeof dataRows>;

/**
 * A single parsed row ready for insertion.
 * `data` is a plain JSON object — for CSV/JSON it contains key/value pairs,
 * for text it contains `{ text: "..." }`.
 */
export interface ParsedRow {
  rowNumber: number;
  data: Record<string, unknown>;
}

export interface ParseResult {
  rows: ParsedRow[];
  /** Column names (CSV/JSON keys). Empty for plain text. */
  columns: string[];
  rowCount: number;
}
