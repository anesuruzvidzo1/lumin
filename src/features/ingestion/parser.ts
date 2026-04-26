import Papa from "papaparse";

import type { DataSourceType } from "@/features/data-sources";

import { IngestionParseFailedError } from "./errors";
import type { ParsedRow, ParseResult } from "./models";

/** Max characters per text chunk before splitting further. */
const TEXT_CHUNK_MAX_CHARS = 2000;

/**
 * Parse CSV content using PapaParse.
 * Each data row becomes a `Record<string, string>`.
 */
function parseCsv(content: string): ParseResult {
  const result = Papa.parse<Record<string, string>>(content.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  // Filter out non-critical PapaParse warnings (delimiter detection noise and
  // field-count mismatches on ragged rows — PapaParse still parses these correctly).
  const criticalErrors = result.errors.filter(
    (e) => e.type !== "Delimiter" && e.type !== "FieldMismatch",
  );
  if (criticalErrors.length > 0) {
    const first = criticalErrors[0];
    const msg = first ? `${first.type}: ${first.message} (row ${first.row ?? "?"})` : "unknown";
    throw new IngestionParseFailedError("csv", msg);
  }

  const columns = result.meta.fields ?? [];
  const rows: ParsedRow[] = result.data.map((row, i) => ({
    rowNumber: i + 1,
    data: row as Record<string, unknown>,
  }));

  return { rows, columns, rowCount: rows.length };
}

/**
 * Parse JSON content.
 * - Array of objects → each element is a row
 * - Single object → one row
 * - Primitives/arrays of primitives → wrapped in `{ value: ... }`
 */
function parseJson(content: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    throw new IngestionParseFailedError("json", err instanceof Error ? err.message : String(err));
  }

  if (Array.isArray(parsed)) {
    const rows: ParsedRow[] = parsed.map((item, i) => ({
      rowNumber: i + 1,
      data:
        item !== null && typeof item === "object"
          ? (item as Record<string, unknown>)
          : { value: item },
    }));

    // Derive columns from keys of the first object-type element
    const firstObj = parsed.find((el) => el !== null && typeof el === "object");
    const columns = firstObj ? Object.keys(firstObj as object) : [];

    return { rows, columns, rowCount: rows.length };
  }

  // Single object or primitive
  const data =
    parsed !== null && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : { value: parsed };
  const columns = Object.keys(data);
  return { rows: [{ rowNumber: 1, data }], columns, rowCount: 1 };
}

/**
 * When a paragraph exceeds TEXT_CHUNK_MAX_CHARS, split it further on
 * individual lines, grouping lines until the limit is reached.
 */
function splitLongChunk(chunk: string): string[] {
  const lines = chunk.split("\n").filter((l) => l.trim().length > 0);
  const result: string[] = [];
  let current = "";

  for (const line of lines) {
    if (current.length + line.length + 1 > TEXT_CHUNK_MAX_CHARS && current.length > 0) {
      result.push(current.trim());
      current = line;
    } else {
      current = current.length > 0 ? `${current}\n${line}` : line;
    }
  }

  if (current.trim().length > 0) {
    result.push(current.trim());
  }

  return result;
}

/**
 * Parse plain-text content into chunks.
 * Splits on double newlines (paragraphs) first, then trims to TEXT_CHUNK_MAX_CHARS.
 * Each chunk becomes a row with `{ text: "..." }`.
 */
function parseText(content: string): ParseResult {
  const rawChunks = content
    .split(/\n{2,}/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  const finalChunks: string[] = [];
  for (const chunk of rawChunks) {
    if (chunk.length <= TEXT_CHUNK_MAX_CHARS) {
      finalChunks.push(chunk);
    } else {
      finalChunks.push(...splitLongChunk(chunk));
    }
  }

  const rows: ParsedRow[] = finalChunks.map((text, i) => ({
    rowNumber: i + 1,
    data: { text },
  }));

  return { rows, columns: ["text"], rowCount: rows.length };
}

/**
 * Parse file content into structured rows.
 * Pure function — no I/O, safe to test directly.
 */
export function parseContent(content: string, type: DataSourceType): ParseResult {
  if (type === "csv") {
    return parseCsv(content);
  }
  if (type === "json") {
    return parseJson(content);
  }
  // type === "text"
  return parseText(content);
}
