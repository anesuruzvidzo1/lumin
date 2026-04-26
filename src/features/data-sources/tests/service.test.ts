import { beforeEach, describe, expect, it, mock } from "bun:test";

import type { Project } from "@/features/projects";

import type { DataSource } from "../models";

// ── Mock storage ──────────────────────────────────────────────────────────────
const mockStorage = {
  uploadFile: mock<(key: string, file: File, contentType: string) => Promise<string>>(() =>
    Promise.resolve("key"),
  ),
  deleteFile: mock<(key: string) => Promise<void>>(() => Promise.resolve()),
  createSignedUrl: mock<(key: string, expiresIn?: number) => Promise<string>>(() =>
    Promise.resolve("https://example.com/signed"),
  ),
  STORAGE_BUCKET: "data-sources",
};
mock.module("@/core/storage", () => mockStorage);

// ── Mock projects feature ─────────────────────────────────────────────────────
const mockProject: Project = {
  id: "proj-111",
  name: "Test Project",
  slug: "test-project",
  description: null,
  isPublic: false,
  ownerId: "user-111",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockGetProject = mock<(id: string, userId: string | null) => Promise<Project>>(() =>
  Promise.resolve(mockProject),
);
mock.module("@/features/projects", () => ({ getProject: mockGetProject }));

// ── Mock ingestion feature ────────────────────────────────────────────────────
const mockIngestDataSource = mock<
  (id: string, content: string, type: string) => Promise<{ rowCount: number; metadata: object }>
>(() => Promise.resolve({ rowCount: 2, metadata: { columns: ["id", "msg"], rowCount: 2 } }));
mock.module("@/features/ingestion", () => ({ ingestDataSource: mockIngestDataSource }));

// ── Mock repository ───────────────────────────────────────────────────────────
const processingSource: DataSource = {
  id: "src-111",
  projectId: "proj-111",
  name: "Tickets",
  type: "csv",
  storageKey: "proj-111/src-111/tickets.csv",
  fileSize: 1024,
  rowCount: null,
  status: "processing",
  errorMessage: null,
  metadata: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const readySource: DataSource = {
  ...processingSource,
  rowCount: 2,
  status: "ready",
  metadata: { columns: ["id", "msg"], rowCount: 2 },
};

const mockRepository = {
  findById: mock<(id: string) => Promise<DataSource | undefined>>(() => Promise.resolve(undefined)),
  findByProjectId: mock<(projectId: string) => Promise<DataSource[]>>(() => Promise.resolve([])),
  findByIdAndProject: mock<(id: string, projectId: string) => Promise<DataSource | undefined>>(() =>
    Promise.resolve(undefined),
  ),
  create: mock<(data: unknown) => Promise<DataSource>>(() => Promise.resolve(processingSource)),
  updateStatus: mock<
    (id: string, status: string, extra?: unknown) => Promise<DataSource | undefined>
  >(() => Promise.resolve(readySource)),
  deleteById: mock<(id: string) => Promise<boolean>>(() => Promise.resolve(true)),
  countByProjectId: mock<(projectId: string) => Promise<number>>(() => Promise.resolve(0)),
};
mock.module("../repository", () => mockRepository);

// ── Import service after mocks ────────────────────────────────────────────────
const { createDataSource, listDataSources, getDataSource, deleteDataSource } = await import(
  "../service"
);

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeFile(name: string, content: string, type = "text/csv"): File {
  return new File([content], name, { type });
}

const CSV_CONTENT = "id,message\n1,hello\n2,world";
const ownerId = "user-111";
const projectId = "proj-111";

// ── createDataSource ──────────────────────────────────────────────────────────

describe("createDataSource", () => {
  beforeEach(() => {
    mockStorage.uploadFile.mockReset();
    mockStorage.uploadFile.mockResolvedValue("storage-key");
    mockRepository.create.mockReset();
    mockRepository.create.mockResolvedValue(processingSource);
    mockRepository.updateStatus.mockReset();
    mockRepository.updateStatus.mockResolvedValue(readySource);
    mockIngestDataSource.mockReset();
    mockIngestDataSource.mockResolvedValue({
      rowCount: 2,
      metadata: { columns: ["id", "message"], rowCount: 2 },
    });
    mockGetProject.mockReset();
    mockGetProject.mockResolvedValue(mockProject);
  });

  it("uploads file, creates processing record, ingests rows, updates to ready", async () => {
    const file = makeFile("tickets.csv", CSV_CONTENT);
    const result = await createDataSource({ name: "Tickets" }, file, projectId, ownerId);

    expect(result.status).toBe("ready");
    expect(mockStorage.uploadFile).toHaveBeenCalledTimes(1);
    expect(mockRepository.create).toHaveBeenCalledTimes(1);
    expect(mockIngestDataSource).toHaveBeenCalledTimes(1);
    expect(mockRepository.updateStatus).toHaveBeenCalledWith(
      processingSource.id,
      "ready",
      expect.objectContaining({ rowCount: 2 }),
    );
  });

  it("rejects files over the size limit before uploading", async () => {
    const bigFile = new File(["x".repeat(51 * 1024 * 1024)], "big.csv", { type: "text/csv" });
    await expect(createDataSource({ name: "Big" }, bigFile, projectId, ownerId)).rejects.toThrow(
      "size limit",
    );
    expect(mockStorage.uploadFile).not.toHaveBeenCalled();
  });

  it("rejects unsupported file types before uploading", async () => {
    const xlsxFile = makeFile("data.xlsx", "binary", "application/vnd.ms-excel");
    await expect(createDataSource({ name: "Excel" }, xlsxFile, projectId, ownerId)).rejects.toThrow(
      "Invalid file type",
    );
    expect(mockStorage.uploadFile).not.toHaveBeenCalled();
  });

  it("throws access denied when project owner differs from caller", async () => {
    mockGetProject.mockResolvedValueOnce({ ...mockProject, ownerId: "other-user" });
    const file = makeFile("tickets.csv", CSV_CONTENT);
    await expect(createDataSource({ name: "Tickets" }, file, projectId, ownerId)).rejects.toThrow(
      "Access denied",
    );
  });

  it("throws upload error when storage fails and does not create a DB record", async () => {
    mockStorage.uploadFile.mockRejectedValueOnce(new Error("bucket missing"));
    const file = makeFile("tickets.csv", CSV_CONTENT);
    await expect(createDataSource({ name: "Tickets" }, file, projectId, ownerId)).rejects.toThrow(
      "upload failed",
    );
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it("marks status as error when ingestion fails after a successful upload", async () => {
    mockIngestDataSource.mockRejectedValueOnce(new Error("parse blew up"));
    mockRepository.updateStatus.mockResolvedValue({
      ...processingSource,
      status: "error",
      errorMessage: "parse blew up",
    });

    const file = makeFile("tickets.csv", CSV_CONTENT);
    const result = await createDataSource({ name: "Tickets" }, file, projectId, ownerId);

    expect(mockRepository.updateStatus).toHaveBeenCalledWith(
      processingSource.id,
      "error",
      expect.objectContaining({ errorMessage: "parse blew up" }),
    );
    expect(result.status).toBe("error");
  });
});

// ── listDataSources ───────────────────────────────────────────────────────────

describe("listDataSources", () => {
  beforeEach(() => {
    mockRepository.findByProjectId.mockReset();
    mockGetProject.mockReset();
    mockGetProject.mockResolvedValue(mockProject);
  });

  it("returns data sources for a project", async () => {
    mockRepository.findByProjectId.mockResolvedValue([readySource]);
    const result = await listDataSources(projectId, ownerId);
    expect(result).toEqual([readySource]);
  });

  it("returns empty array when no sources", async () => {
    mockRepository.findByProjectId.mockResolvedValue([]);
    const result = await listDataSources(projectId, ownerId);
    expect(result).toEqual([]);
  });
});

// ── getDataSource ─────────────────────────────────────────────────────────────

describe("getDataSource", () => {
  beforeEach(() => {
    mockRepository.findById.mockReset();
    mockGetProject.mockReset();
    mockGetProject.mockResolvedValue(mockProject);
  });

  it("returns a data source by ID", async () => {
    mockRepository.findById.mockResolvedValue(readySource);
    const result = await getDataSource(readySource.id, ownerId);
    expect(result).toEqual(readySource);
  });

  it("throws not found when source does not exist", async () => {
    mockRepository.findById.mockResolvedValue(undefined);
    await expect(getDataSource("missing-id", ownerId)).rejects.toThrow("not found");
  });
});

// ── deleteDataSource ──────────────────────────────────────────────────────────

describe("deleteDataSource", () => {
  beforeEach(() => {
    mockRepository.findById.mockReset();
    mockRepository.deleteById.mockReset();
    mockStorage.deleteFile.mockReset();
    mockGetProject.mockReset();
    mockGetProject.mockResolvedValue(mockProject);
  });

  it("deletes the source and its storage file", async () => {
    mockRepository.findById.mockResolvedValue(readySource);
    mockRepository.deleteById.mockResolvedValue(true);
    mockStorage.deleteFile.mockResolvedValue(undefined);

    await expect(deleteDataSource(readySource.id, ownerId)).resolves.toBeUndefined();
    expect(mockStorage.deleteFile).toHaveBeenCalledWith(readySource.storageKey);
    expect(mockRepository.deleteById).toHaveBeenCalledWith(readySource.id);
  });

  it("throws not found when source does not exist", async () => {
    mockRepository.findById.mockResolvedValue(undefined);
    await expect(deleteDataSource("missing-id", ownerId)).rejects.toThrow("not found");
  });

  it("still deletes DB record if storage delete fails", async () => {
    mockRepository.findById.mockResolvedValue(readySource);
    mockRepository.deleteById.mockResolvedValue(true);
    mockStorage.deleteFile.mockRejectedValueOnce(new Error("not found in storage"));

    await expect(deleteDataSource(readySource.id, ownerId)).resolves.toBeUndefined();
    expect(mockRepository.deleteById).toHaveBeenCalledWith(readySource.id);
  });
});
