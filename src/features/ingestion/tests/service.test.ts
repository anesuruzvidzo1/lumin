import { beforeEach, describe, expect, it, mock } from "bun:test";

import type { DataRow } from "../models";

// ── Mock repository ───────────────────────────────────────────────────────────
const mockRepository = {
  batchInsert: mock<(rows: unknown[]) => Promise<void>>(() => Promise.resolve()),
  findByDataSourceId: mock<
    (id: string, opts?: { limit?: number; offset?: number }) => Promise<DataRow[]>
  >(() => Promise.resolve([])),
  findSample: mock<(id: string, limit?: number) => Promise<DataRow[]>>(() => Promise.resolve([])),
  countByDataSourceId: mock<(id: string) => Promise<number>>(() => Promise.resolve(0)),
  deleteByDataSourceId: mock<(id: string) => Promise<void>>(() => Promise.resolve()),
};
mock.module("../repository", () => mockRepository);

const { ingestDataSource, getRows, getSampleRows, deleteRows } = await import("../service");

const SOURCE_ID = "src-abc-123";
const CSV_CONTENT = "name,score\nAlice,95\nBob,87";
const JSON_CONTENT = JSON.stringify([{ id: 1 }, { id: 2 }]);
const TEXT_CONTENT = "First chunk.\n\nSecond chunk.";

describe("ingestDataSource", () => {
  beforeEach(() => {
    mockRepository.batchInsert.mockReset();
    mockRepository.batchInsert.mockResolvedValue(undefined);
  });

  it("inserts rows and returns rowCount + metadata for CSV", async () => {
    const result = await ingestDataSource(SOURCE_ID, CSV_CONTENT, "csv");

    expect(result.rowCount).toBe(2);
    expect(result.metadata.columns).toEqual(["name", "score"]);
    expect(mockRepository.batchInsert).toHaveBeenCalledTimes(1);

    const inserted = mockRepository.batchInsert.mock.calls[0]?.[0] as { rowNumber: number }[];
    expect(inserted).toHaveLength(2);
    expect(inserted[0]?.rowNumber).toBe(1);
    expect(inserted[1]?.rowNumber).toBe(2);
  });

  it("inserts rows and returns rowCount + metadata for JSON", async () => {
    const result = await ingestDataSource(SOURCE_ID, JSON_CONTENT, "json");

    expect(result.rowCount).toBe(2);
    expect(result.metadata.columns).toEqual(["id"]);
    expect(mockRepository.batchInsert).toHaveBeenCalledTimes(1);
  });

  it("inserts chunks and returns lineCount for text", async () => {
    const result = await ingestDataSource(SOURCE_ID, TEXT_CONTENT, "text");

    expect(result.rowCount).toBe(2);
    expect(result.metadata.lineCount).toBe(2);
    expect(result.metadata.columns).toBeUndefined();
  });

  it("propagates parse errors so the caller can mark the source as failed", async () => {
    await expect(ingestDataSource(SOURCE_ID, "not json", "json")).rejects.toThrow();
    // batchInsert should not be called when parsing fails
    expect(mockRepository.batchInsert).not.toHaveBeenCalled();
  });

  it("attaches the correct dataSourceId to every inserted row", async () => {
    await ingestDataSource(SOURCE_ID, CSV_CONTENT, "csv");
    const rows = mockRepository.batchInsert.mock.calls[0]?.[0] as { dataSourceId: string }[];
    for (const row of rows) {
      expect(row.dataSourceId).toBe(SOURCE_ID);
    }
  });
});

describe("getRows", () => {
  beforeEach(() => {
    mockRepository.findByDataSourceId.mockReset();
  });

  it("delegates to repository with options", async () => {
    const fakeRows: DataRow[] = [
      { id: "r1", dataSourceId: SOURCE_ID, rowNumber: 1, data: { a: 1 }, createdAt: new Date() },
    ];
    mockRepository.findByDataSourceId.mockResolvedValue(fakeRows);

    const result = await getRows(SOURCE_ID, { limit: 10, offset: 0 });
    expect(result).toEqual(fakeRows);
    expect(mockRepository.findByDataSourceId).toHaveBeenCalledWith(SOURCE_ID, {
      limit: 10,
      offset: 0,
    });
  });
});

describe("getSampleRows", () => {
  beforeEach(() => {
    mockRepository.findSample.mockReset();
  });

  it("delegates to repository with default limit of 50", async () => {
    mockRepository.findSample.mockResolvedValue([]);
    await getSampleRows(SOURCE_ID);
    expect(mockRepository.findSample).toHaveBeenCalledWith(SOURCE_ID, 50);
  });

  it("delegates to repository with custom limit", async () => {
    mockRepository.findSample.mockResolvedValue([]);
    await getSampleRows(SOURCE_ID, 20);
    expect(mockRepository.findSample).toHaveBeenCalledWith(SOURCE_ID, 20);
  });
});

describe("deleteRows", () => {
  beforeEach(() => {
    mockRepository.deleteByDataSourceId.mockReset();
  });

  it("calls repository delete", async () => {
    mockRepository.deleteByDataSourceId.mockResolvedValue(undefined);
    await deleteRows(SOURCE_ID);
    expect(mockRepository.deleteByDataSourceId).toHaveBeenCalledWith(SOURCE_ID);
  });
});
