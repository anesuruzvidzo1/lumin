import { AI_MODEL, anthropic } from "@/core/ai";
import { getLogger } from "@/core/logging";

import * as repository from "./repository";

const logger = getLogger("suggested-questions.service");

/**
 * Generate 5 suggested questions for a data source using Claude.
 * Called after ingestion succeeds (status → "ready").
 *
 * @param dataSourceId  The data source to generate questions for
 * @param sourceName    Human-readable name of the source
 * @param columns       Column names extracted during ingestion
 * @param sampleValues  A few sample row values per column for context
 */
export async function generateSuggestedQuestions(
  dataSourceId: string,
  sourceName: string,
  columns: string[],
  sampleValues: Record<string, string[]>,
): Promise<string[]> {
  logger.info({ dataSourceId, columns }, "suggested_questions.generate_started");

  const columnSummary =
    columns.length > 0
      ? columns
          .map((col) => {
            const samples = sampleValues[col]?.slice(0, 3).join(", ") ?? "";
            return samples ? `${col} (e.g. ${samples})` : col;
          })
          .join(", ")
      : "unknown columns";

  const prompt = `You are a data analyst. A user has uploaded a dataset called "${sourceName}" with the following columns: ${columnSummary}.

Generate exactly 5 short, plain-English questions a non-technical user would want to ask about this data. Questions should be:
- Specific to these column names
- Varied (mix of counts, averages, trends, rankings, comparisons)
- Concise (under 15 words each)
- No markdown, no numbering, no bullet points — just one question per line

Output only the 5 questions, one per line, nothing else.`;

  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const block = response.content[0];
    const text = block?.type === "text" ? block.text.trim() : "";

    const questions = text
      .split("\n")
      .map((q) => q.trim())
      .filter((q) => q.length > 0)
      .slice(0, 5);

    await repository.create({
      dataSourceId,
      questions,
    });

    logger.info(
      { dataSourceId, count: questions.length },
      "suggested_questions.generate_completed",
    );
    return questions;
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    logger.error({ dataSourceId, cause }, "suggested_questions.generate_failed");
    // Non-fatal — return empty so ingestion still succeeds
    return [];
  }
}

/**
 * Get all suggested questions for a list of data source IDs.
 * Flattens across all sources and deduplicates.
 */
export async function getSuggestedQuestionsForSources(dataSourceIds: string[]): Promise<string[]> {
  const rows = await repository.findByDataSourceIds(dataSourceIds);
  const seen = new Set<string>();
  const questions: string[] = [];
  for (const row of rows) {
    const qs = row.questions as string[];
    for (const q of qs) {
      if (!seen.has(q)) {
        seen.add(q);
        questions.push(q);
      }
    }
  }
  return questions.slice(0, 10);
}
