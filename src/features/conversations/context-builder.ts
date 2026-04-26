import type { DataSource, DataSourceMetadata } from "@/features/data-sources";
import type { DataRow } from "@/features/ingestion";

/**
 * Build the system prompt sent to Claude for every query in this conversation.
 *
 * We describe the available data sources and include sample rows so the model
 * has enough grounding to answer questions accurately.
 */
export function buildSystemPrompt(
  sources: DataSource[],
  samplesBySource: Map<string, DataRow[]>,
): string {
  const sourceDescriptions = sources
    .map((s) => describeSource(s, samplesBySource.get(s.id) ?? []))
    .join("\n\n---\n\n");

  return `You are Lumin, an AI data analyst. Your job is to answer plain-English questions about the data the user has uploaded.

## Available data sources

${sourceDescriptions}

## How to respond

- Answer the user's question clearly and concisely based only on the data above.
- If you can compute a number (count, average, percentage), do it and show your working.
- If a chart would make the answer clearer, include a Vega-Lite JSON spec in a fenced code block labelled \`\`\`vega-lite\`\`\`. Use simple chart types (bar, line, arc/pie). Keep the spec self-contained with inline data.
- If the data does not contain enough information to answer the question, say so honestly.
- Do not make up data that isn't in the sample rows.
- Keep responses focused — no preamble, no filler.
- Write in plain prose. Do not use markdown formatting: no headers (##), no bold (**text**), no italics (*text*), no bullet lists with asterisks, no pipe tables (|col|col|). Use natural paragraph breaks to separate ideas.`;
}

function describeSource(source: DataSource, rows: DataRow[]): string {
  const meta = source.metadata as DataSourceMetadata | null;
  const columns = meta?.columns ?? [];
  const rowCount = source.rowCount ?? rows.length;
  const typeLabel = source.type.toUpperCase();

  const header = `### ${source.name} (${typeLabel})
- **Rows**: ${rowCount.toLocaleString()}${columns.length > 0 ? `\n- **Columns**: ${columns.join(", ")}` : ""}`;

  if (rows.length === 0) {
    return `${header}\n\n(No sample rows available)`;
  }

  const sampleSection = formatSampleRows(source.type, rows);
  return `${header}\n\n**Sample rows**:\n${sampleSection}`;
}

function formatSampleRows(type: DataSource["type"], rows: DataRow[]): string {
  if (type === "text") {
    return rows
      .slice(0, 20)
      .map((r, i) => {
        const data = r.data as { text?: string };
        return `[${i + 1}] ${data.text ?? ""}`;
      })
      .join("\n");
  }

  // CSV / JSON — render as a compact table
  if (rows.length === 0) {
    return "(empty)";
  }

  const firstRow = rows[0]?.data as Record<string, unknown> | undefined;
  if (!firstRow) {
    return "(empty)";
  }

  const keys = Object.keys(firstRow);
  const header = `| ${keys.join(" | ")} |`;
  const divider = `| ${keys.map(() => "---").join(" | ")} |`;
  const dataRows = rows.slice(0, 20).map((r) => {
    const row = r.data as Record<string, unknown>;
    const cells = keys.map((k) => String(row[k] ?? "").replace(/\|/g, "\\|"));
    return `| ${cells.join(" | ")} |`;
  });

  return [header, divider, ...dataRows].join("\n");
}
