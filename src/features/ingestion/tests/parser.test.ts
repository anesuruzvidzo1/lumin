import { describe, expect, it } from "bun:test";

import { IngestionParseFailedError } from "../errors";
import { parseContent } from "../parser";

// ─── CSV ──────────────────────────────────────────────────────────────────────

describe("parseContent - csv", () => {
  it("parses headers and rows", () => {
    const csv = "id,name,score\n1,Alice,95\n2,Bob,87";
    const result = parseContent(csv, "csv");

    expect(result.columns).toEqual(["id", "name", "score"]);
    expect(result.rowCount).toBe(2);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({ rowNumber: 1, data: { id: "1", name: "Alice", score: "95" } });
    expect(result.rows[1]).toEqual({ rowNumber: 2, data: { id: "2", name: "Bob", score: "87" } });
  });

  it("assigns sequential row numbers starting at 1", () => {
    const csv = "a,b\n1,2\n3,4\n5,6";
    const result = parseContent(csv, "csv");
    expect(result.rows.map((r) => r.rowNumber)).toEqual([1, 2, 3]);
  });

  it("trims whitespace from headers", () => {
    const csv = " name , email \nhello,world";
    const result = parseContent(csv, "csv");
    expect(result.columns).toEqual(["name", "email"]);
  });

  it("skips empty lines", () => {
    const csv = "a,b\n1,2\n\n3,4\n";
    const result = parseContent(csv, "csv");
    expect(result.rowCount).toBe(2);
  });

  it("handles quoted fields containing commas", () => {
    const csv = `name,message\nAlice,"Hello, world"\nBob,Hi`;
    const result = parseContent(csv, "csv");
    expect(result.rows[0]?.data["message"]).toBe("Hello, world");
  });

  it("handles a single-column CSV", () => {
    const csv = "ticket\nissue one\nissue two";
    const result = parseContent(csv, "csv");
    expect(result.columns).toEqual(["ticket"]);
    expect(result.rowCount).toBe(2);
  });
});

// ─── JSON ─────────────────────────────────────────────────────────────────────

describe("parseContent - json", () => {
  it("parses an array of objects", () => {
    const json = JSON.stringify([
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ]);
    const result = parseContent(json, "json");

    expect(result.rowCount).toBe(2);
    expect(result.columns).toEqual(["id", "name"]);
    expect(result.rows[0]).toEqual({ rowNumber: 1, data: { id: 1, name: "Alice" } });
  });

  it("parses a single object as one row", () => {
    const json = JSON.stringify({ status: "ok", count: 3 });
    const result = parseContent(json, "json");

    expect(result.rowCount).toBe(1);
    expect(result.rows[0]?.data).toEqual({ status: "ok", count: 3 });
    expect(result.columns).toEqual(["status", "count"]);
  });

  it("handles an array of primitives by wrapping in value", () => {
    const json = JSON.stringify([1, 2, 3]);
    const result = parseContent(json, "json");

    expect(result.rowCount).toBe(3);
    expect(result.rows[0]?.data).toEqual({ value: 1 });
  });

  it("handles an empty array", () => {
    const json = "[]";
    const result = parseContent(json, "json");
    expect(result.rowCount).toBe(0);
    expect(result.rows).toHaveLength(0);
  });

  it("throws IngestionParseFailedError on invalid JSON", () => {
    expect(() => parseContent("not json", "json")).toThrow(IngestionParseFailedError);
  });
});

// ─── Text ─────────────────────────────────────────────────────────────────────

describe("parseContent - text", () => {
  it("splits on double newlines into paragraphs", () => {
    const text = "First paragraph.\n\nSecond paragraph.\n\nThird.";
    const result = parseContent(text, "text");

    expect(result.rowCount).toBe(3);
    expect(result.rows[0]?.data).toEqual({ text: "First paragraph." });
    expect(result.rows[1]?.data).toEqual({ text: "Second paragraph." });
    expect(result.rows[2]?.data).toEqual({ text: "Third." });
  });

  it("filters empty chunks", () => {
    const text = "\n\nHello\n\n\n\nWorld\n\n";
    const result = parseContent(text, "text");
    expect(result.rowCount).toBe(2);
  });

  it("uses text as the only column", () => {
    const text = "some text";
    const result = parseContent(text, "text");
    expect(result.columns).toEqual(["text"]);
  });

  it("assigns sequential row numbers", () => {
    const text = "a\n\nb\n\nc";
    const result = parseContent(text, "text");
    expect(result.rows.map((r) => r.rowNumber)).toEqual([1, 2, 3]);
  });

  it("splits a single very long paragraph on newlines when it exceeds 2000 chars", () => {
    const longLine = "x".repeat(500);
    // 5 lines, each 500 chars — total 2500 chars — should be split
    const text = [longLine, longLine, longLine, longLine, longLine].join("\n");
    const result = parseContent(text, "text");
    expect(result.rowCount).toBeGreaterThan(1);
    for (const row of result.rows) {
      const textVal = (row.data as { text: string }).text;
      expect(textVal.length).toBeLessThanOrEqual(2000);
    }
  });

  it("handles a file with one entry per line (no double newlines)", () => {
    const text = "Ticket 1: broken login\nTicket 2: page load slow\nTicket 3: button missing";
    const result = parseContent(text, "text");
    // Treated as one paragraph, then split on lines because it's within 2000 chars
    expect(result.rowCount).toBeGreaterThanOrEqual(1);
  });
});
