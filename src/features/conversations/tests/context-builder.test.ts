import { describe, expect, it } from "bun:test";

import type { DataSource } from "@/features/data-sources";
import type { DataRow } from "@/features/ingestion";

import { buildSystemPrompt } from "../context-builder";

function makeSource(overrides: Partial<DataSource> = {}): DataSource {
  return {
    id: "src-1",
    projectId: "proj-1",
    name: "Support Tickets",
    type: "csv",
    storageKey: "proj-1/src-1/tickets.csv",
    fileSize: 1024,
    rowCount: 100,
    status: "ready",
    errorMessage: null,
    metadata: { columns: ["id", "issue", "status"], rowCount: 100 },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeRow(rowNumber: number, data: Record<string, unknown>): DataRow {
  return { id: `row-${rowNumber}`, dataSourceId: "src-1", rowNumber, data, createdAt: new Date() };
}

describe("buildSystemPrompt", () => {
  it("includes the source name and column list", () => {
    const source = makeSource();
    const rows = [makeRow(1, { id: "1", issue: "Login broken", status: "open" })];
    const prompt = buildSystemPrompt([source], new Map([["src-1", rows]]));

    expect(prompt).toContain("Support Tickets");
    expect(prompt).toContain("id, issue, status");
  });

  it("includes the row count", () => {
    const source = makeSource({ rowCount: 42 });
    const prompt = buildSystemPrompt([source], new Map([["src-1", []]]));
    expect(prompt).toContain("42");
  });

  it("renders CSV rows as a markdown table", () => {
    const source = makeSource();
    const rows = [
      makeRow(1, { id: "1", issue: "Login broken", status: "open" }),
      makeRow(2, { id: "2", issue: "Page load slow", status: "closed" }),
    ];
    const prompt = buildSystemPrompt([source], new Map([["src-1", rows]]));

    expect(prompt).toContain("| id | issue | status |");
    expect(prompt).toContain("Login broken");
    expect(prompt).toContain("Page load slow");
  });

  it("renders text sources as numbered chunks", () => {
    const source = makeSource({ type: "text", metadata: { lineCount: 2 } });
    const rows = [
      makeRow(1, { text: "First chunk of feedback." }),
      makeRow(2, { text: "Second chunk of feedback." }),
    ];
    const prompt = buildSystemPrompt([source], new Map([["src-1", rows]]));

    expect(prompt).toContain("[1] First chunk of feedback.");
    expect(prompt).toContain("[2] Second chunk of feedback.");
  });

  it("handles multiple sources", () => {
    const s1 = makeSource({ id: "src-1", name: "Tickets" });
    const s2 = makeSource({ id: "src-2", name: "Feedback", type: "json" });
    const prompt = buildSystemPrompt(
      [s1, s2],
      new Map([
        ["src-1", []],
        ["src-2", []],
      ]),
    );

    expect(prompt).toContain("Tickets");
    expect(prompt).toContain("Feedback");
  });

  it("handles a source with no sample rows gracefully", () => {
    const source = makeSource();
    const prompt = buildSystemPrompt([source], new Map([["src-1", []]]));
    expect(prompt).toContain("Support Tickets");
    expect(prompt).not.toThrow;
  });

  it("includes Vega-Lite chart instruction", () => {
    const prompt = buildSystemPrompt([], new Map());
    expect(prompt).toContain("vega-lite");
  });
});
