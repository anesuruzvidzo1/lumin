import type { HttpStatusCode } from "@/core/api/errors";

export type DataSourceErrorCode =
  | "DATA_SOURCE_NOT_FOUND"
  | "DATA_SOURCE_ACCESS_DENIED"
  | "DATA_SOURCE_INVALID_FILE_TYPE"
  | "DATA_SOURCE_FILE_TOO_LARGE"
  | "DATA_SOURCE_UPLOAD_FAILED"
  | "DATA_SOURCE_PARSE_FAILED";

export class DataSourceError extends Error {
  readonly code: DataSourceErrorCode;
  readonly statusCode: HttpStatusCode;

  constructor(message: string, code: DataSourceErrorCode, statusCode: HttpStatusCode) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class DataSourceNotFoundError extends DataSourceError {
  constructor(id: string) {
    super(`Data source not found: ${id}`, "DATA_SOURCE_NOT_FOUND", 404);
  }
}

export class DataSourceAccessDeniedError extends DataSourceError {
  constructor(id: string) {
    super(`Access denied to data source: ${id}`, "DATA_SOURCE_ACCESS_DENIED", 403);
  }
}

export class DataSourceInvalidFileTypeError extends DataSourceError {
  constructor(filename: string) {
    super(
      `Invalid file type for "${filename}". Allowed: .csv, .json, .txt`,
      "DATA_SOURCE_INVALID_FILE_TYPE",
      400,
    );
  }
}

export class DataSourceFileTooLargeError extends DataSourceError {
  constructor(maxMb: number) {
    super(`File exceeds the ${maxMb} MB size limit`, "DATA_SOURCE_FILE_TOO_LARGE", 400);
  }
}

export class DataSourceUploadFailedError extends DataSourceError {
  constructor(cause: string) {
    super(`File upload failed: ${cause}`, "DATA_SOURCE_UPLOAD_FAILED", 500);
  }
}

export class DataSourceParseFailedError extends DataSourceError {
  constructor(cause: string) {
    super(`File parsing failed: ${cause}`, "DATA_SOURCE_PARSE_FAILED", 400);
  }
}
