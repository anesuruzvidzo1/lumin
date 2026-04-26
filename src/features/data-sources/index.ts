// Errors
export type { DataSourceErrorCode } from "./errors";
export {
  DataSourceAccessDeniedError,
  DataSourceError,
  DataSourceFileTooLargeError,
  DataSourceInvalidFileTypeError,
  DataSourceNotFoundError,
  DataSourceParseFailedError,
  DataSourceUploadFailedError,
} from "./errors";

// Models / types
export type {
  DataSource,
  DataSourceMetadata,
  DataSourceStatus,
  DataSourceType,
  NewDataSource,
} from "./models";

// Schemas
export type { CreateDataSourceInput, DataSourceResponse } from "./schemas";
export {
  ALLOWED_EXTENSIONS,
  ALLOWED_TYPES,
  CreateDataSourceSchema,
  DataSourceResponseSchema,
  MAX_FILE_SIZE_BYTES,
} from "./schemas";

// Service functions (public API — repository stays internal)
export {
  createDataSource,
  deleteDataSource,
  getDataSource,
  listDataSources,
} from "./service";
