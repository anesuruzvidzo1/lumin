import { describe, expect, it } from "bun:test";

import {
  DataSourceAccessDeniedError,
  DataSourceFileTooLargeError,
  DataSourceInvalidFileTypeError,
  DataSourceNotFoundError,
  DataSourceParseFailedError,
  DataSourceUploadFailedError,
} from "../errors";

describe("DataSourceNotFoundError", () => {
  it("has correct code and status", () => {
    const err = new DataSourceNotFoundError("abc");
    expect(err.code).toBe("DATA_SOURCE_NOT_FOUND");
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain("abc");
  });
});

describe("DataSourceAccessDeniedError", () => {
  it("has correct code and status", () => {
    const err = new DataSourceAccessDeniedError("abc");
    expect(err.code).toBe("DATA_SOURCE_ACCESS_DENIED");
    expect(err.statusCode).toBe(403);
  });
});

describe("DataSourceInvalidFileTypeError", () => {
  it("has correct code and status", () => {
    const err = new DataSourceInvalidFileTypeError("report.xlsx");
    expect(err.code).toBe("DATA_SOURCE_INVALID_FILE_TYPE");
    expect(err.statusCode).toBe(400);
    expect(err.message).toContain("report.xlsx");
  });
});

describe("DataSourceFileTooLargeError", () => {
  it("has correct code, status, and includes limit in message", () => {
    const err = new DataSourceFileTooLargeError(50);
    expect(err.code).toBe("DATA_SOURCE_FILE_TOO_LARGE");
    expect(err.statusCode).toBe(400);
    expect(err.message).toContain("50");
  });
});

describe("DataSourceUploadFailedError", () => {
  it("has correct code and status", () => {
    const err = new DataSourceUploadFailedError("bucket not found");
    expect(err.code).toBe("DATA_SOURCE_UPLOAD_FAILED");
    expect(err.statusCode).toBe(500);
    expect(err.message).toContain("bucket not found");
  });
});

describe("DataSourceParseFailedError", () => {
  it("has correct code and status", () => {
    const err = new DataSourceParseFailedError("invalid JSON");
    expect(err.code).toBe("DATA_SOURCE_PARSE_FAILED");
    expect(err.statusCode).toBe(400);
  });
});
