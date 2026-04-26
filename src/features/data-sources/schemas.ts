import { z } from "zod/v4";

export const ALLOWED_TYPES = ["text/csv", "application/json", "text/plain"] as const;
export const ALLOWED_EXTENSIONS = [".csv", ".json", ".txt"] as const;
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export const CreateDataSourceSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name must be at most 200 characters")
    .trim(),
});

export type CreateDataSourceInput = z.infer<typeof CreateDataSourceSchema>;

export const DataSourceResponseSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string(),
  type: z.enum(["csv", "json", "text"]),
  storageKey: z.string(),
  fileSize: z.number().nullable(),
  rowCount: z.number().nullable(),
  status: z.enum(["processing", "ready", "error"]),
  errorMessage: z.string().nullable(),
  metadata: z.unknown(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type DataSourceResponse = z.infer<typeof DataSourceResponseSchema>;
