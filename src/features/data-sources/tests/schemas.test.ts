import { describe, expect, it } from "bun:test";

import { ALLOWED_EXTENSIONS, CreateDataSourceSchema, MAX_FILE_SIZE_BYTES } from "../schemas";

describe("CreateDataSourceSchema", () => {
  it("accepts a valid name", () => {
    const result = CreateDataSourceSchema.safeParse({ name: "Support tickets" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Support tickets");
    }
  });

  it("trims whitespace", () => {
    const result = CreateDataSourceSchema.safeParse({ name: "  Support tickets  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Support tickets");
    }
  });

  it("rejects empty name", () => {
    const result = CreateDataSourceSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name over 200 characters", () => {
    const result = CreateDataSourceSchema.safeParse({ name: "a".repeat(201) });
    expect(result.success).toBe(false);
  });
});

describe("constants", () => {
  it("ALLOWED_EXTENSIONS contains csv, json, txt", () => {
    expect(ALLOWED_EXTENSIONS).toContain(".csv");
    expect(ALLOWED_EXTENSIONS).toContain(".json");
    expect(ALLOWED_EXTENSIONS).toContain(".txt");
  });

  it("MAX_FILE_SIZE_BYTES is 50 MB", () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(50 * 1024 * 1024);
  });
});
