// Errors
export type { IngestionErrorCode } from "./errors";
export { IngestionError, IngestionParseFailedError, IngestionUnsupportedTypeError } from "./errors";

// Models / types
export type { DataRow, NewDataRow, ParsedRow, ParseResult } from "./models";

// Parser (exported for testing and direct use)
export { parseContent } from "./parser";
export type { IngestResult } from "./service";
// Service functions (public API)
export { deleteRows, getRows, getSampleRows, ingestDataSource } from "./service";
