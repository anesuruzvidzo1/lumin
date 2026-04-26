import type { HttpStatusCode } from "@/core/api/errors";

export type IngestionErrorCode = "INGESTION_PARSE_FAILED" | "INGESTION_UNSUPPORTED_TYPE";

export class IngestionError extends Error {
  readonly code: IngestionErrorCode;
  readonly statusCode: HttpStatusCode;

  constructor(message: string, code: IngestionErrorCode, statusCode: HttpStatusCode) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class IngestionParseFailedError extends IngestionError {
  constructor(type: string, cause: string) {
    super(`Failed to parse ${type} content: ${cause}`, "INGESTION_PARSE_FAILED", 400);
  }
}

export class IngestionUnsupportedTypeError extends IngestionError {
  constructor(type: string) {
    super(`Unsupported ingestion type: ${type}`, "INGESTION_UNSUPPORTED_TYPE", 400);
  }
}
