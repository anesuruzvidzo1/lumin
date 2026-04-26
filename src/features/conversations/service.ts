import type Anthropic from "@anthropic-ai/sdk";

import { AI_MODEL, anthropic, CONTEXT_SAMPLE_ROWS, MAX_RESPONSE_TOKENS } from "@/core/ai";
import { getLogger } from "@/core/logging";
import { listDataSources } from "@/features/data-sources";
import { getSampleRows } from "@/features/ingestion";
import { getProject } from "@/features/projects";

import { buildSystemPrompt } from "./context-builder";
import {
  ConversationAccessDeniedError,
  ConversationAiFailedError,
  ConversationNotFoundError,
} from "./errors";
import type { Conversation, Message } from "./models";
import * as repository from "./repository";
import type { AskQuestionInput, CreateConversationInput } from "./schemas";

const logger = getLogger("conversations.service");

// ── Conversations ─────────────────────────────────────────────────────────────

export async function createConversation(
  input: CreateConversationInput,
  projectId: string,
  userId: string,
): Promise<Conversation> {
  logger.info({ projectId, userId }, "conversation.create_started");

  await getProject(projectId, userId);

  const conversation = await repository.createConversation({
    projectId,
    userId,
    title: input.title,
  });

  logger.info({ conversationId: conversation.id }, "conversation.create_completed");
  return conversation;
}

export async function getConversation(id: string, userId: string): Promise<Conversation> {
  const conv = await repository.findConversationById(id);
  if (!conv) {
    throw new ConversationNotFoundError(id);
  }
  if (conv.userId !== userId) {
    throw new ConversationAccessDeniedError(id);
  }
  return conv;
}

export async function listConversations(
  projectId: string,
  userId: string,
): Promise<Conversation[]> {
  await getProject(projectId, userId);
  return repository.findConversationsByProject(projectId);
}

export async function deleteConversation(id: string, userId: string): Promise<void> {
  logger.info({ conversationId: id, userId }, "conversation.delete_started");
  const conv = await getConversation(id, userId);
  await repository.deleteConversation(conv.id);
  logger.info({ conversationId: id }, "conversation.delete_completed");
}

// ── Messages ──────────────────────────────────────────────────────────────────

export async function getMessages(conversationId: string, userId: string): Promise<Message[]> {
  await getConversation(conversationId, userId);
  return repository.findMessagesByConversation(conversationId);
}

/**
 * Answer a user question using Claude.
 *
 * Flow:
 *   1. Verify conversation ownership
 *   2. Load data sources + sample rows for the parent project
 *   3. Build full message history (for multi-turn context)
 *   4. Call Claude with the system prompt + history
 *   5. Extract any Vega-Lite chart spec from the response
 *   6. Persist both the user message and the assistant reply
 *   7. Return the assistant message
 */
export async function askQuestion(
  conversationId: string,
  input: AskQuestionInput,
  userId: string,
): Promise<Message> {
  logger.info({ conversationId, userId }, "conversation.ask_started");

  const conv = await getConversation(conversationId, userId);

  // Load data sources for the project and build context
  const sources = await listDataSources(conv.projectId, userId);
  const readySources = sources.filter((s) => s.status === "ready");

  const samplesBySource = new Map<string, Awaited<ReturnType<typeof getSampleRows>>>();
  await Promise.all(
    readySources.map(async (s) => {
      const rows = await getSampleRows(s.id, CONTEXT_SAMPLE_ROWS);
      samplesBySource.set(s.id, rows);
    }),
  );

  const systemPrompt = buildSystemPrompt(readySources, samplesBySource);

  // Build message history for multi-turn context
  const history = await repository.findMessagesByConversation(conversationId);
  const claudeHistory: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Persist the user message
  await repository.createMessage({
    conversationId,
    role: "user",
    content: input.question,
    chartSpec: null,
  });

  // Call Claude
  let rawContent: string;
  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: MAX_RESPONSE_TOKENS,
      system: systemPrompt,
      messages: [...claudeHistory, { role: "user", content: input.question }],
    });

    const block = response.content[0];
    rawContent = block?.type === "text" ? block.text : "";
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    logger.error({ conversationId, cause }, "conversation.ai_failed");
    throw new ConversationAiFailedError(cause);
  }

  // Extract Vega-Lite spec if present
  const chartSpec = extractChartSpec(rawContent);

  // Strip the fenced code block then clean any residual markdown formatting
  const stripped = chartSpec
    ? rawContent.replace(/```vega-lite[\s\S]*?```/g, "").trim()
    : rawContent;
  const displayContent = stripMarkdown(stripped);

  // Persist the assistant message
  const assistantMessage = await repository.createMessage({
    conversationId,
    role: "assistant",
    content: displayContent,
    chartSpec: chartSpec ?? null,
  });

  await repository.touchConversation(conversationId);

  logger.info({ conversationId, hasChart: !!chartSpec }, "conversation.ask_completed");
  return assistantMessage;
}

/**
 * Strip markdown formatting from AI-generated text so it reads as clean prose.
 * Removes headers, bold/italic markers, table pipes, blockquotes, and code fences.
 * List bullet prefixes (- item) are removed; the text content is preserved.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*\|.*\|\s*$/gm, "")
    .replace(/^```[^\n]*$/gm, "")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/__([^_\n]+)__/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/(?<![_\w])_([^_\n]+)_(?![_\w])/g, "$1")
    .replace(/^>\s*/gm, "")
    .replace(/^[-*]{3,}\s*$/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extract a Vega-Lite JSON spec from a ```vega-lite ... ``` fenced code block.
 * Returns null if none is present or if the JSON is invalid.
 */
function extractChartSpec(text: string): Record<string, unknown> | null {
  const match = /```vega-lite\s*([\s\S]*?)```/.exec(text);
  if (!match) {
    return null;
  }
  try {
    const parsed = JSON.parse(match[1] ?? "");
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}
