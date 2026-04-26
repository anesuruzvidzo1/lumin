import { getLogger } from "@/core/logging";
import { getProject } from "@/features/projects";

import {
  AlreadyPinnedError,
  PinnedInsightAccessDeniedError,
  PinnedInsightNotFoundError,
} from "./errors";
import type { PinnedInsight } from "./models";
import * as repository from "./repository";

const logger = getLogger("pinned-insights.service");

export async function pinInsight(
  projectId: string,
  messageId: string,
  content: string,
  chartSpec: Record<string, unknown> | null,
  userId: string,
): Promise<PinnedInsight> {
  logger.info({ projectId, messageId, userId }, "pinned_insight.pin_started");

  const project = await getProject(projectId, userId);
  if (project.ownerId !== userId) {
    throw new PinnedInsightAccessDeniedError(projectId);
  }

  const existing = await repository.findByMessageId(messageId);
  if (existing) {
    throw new AlreadyPinnedError(messageId);
  }

  const insight = await repository.create({
    projectId,
    messageId,
    content,
    chartSpec: chartSpec ?? null,
  });

  logger.info({ insightId: insight.id }, "pinned_insight.pin_completed");
  return insight;
}

export async function unpinInsight(id: string, projectId: string, userId: string): Promise<void> {
  logger.info({ insightId: id, userId }, "pinned_insight.unpin_started");

  const project = await getProject(projectId, userId);
  if (project.ownerId !== userId) {
    throw new PinnedInsightAccessDeniedError(id);
  }

  const deleted = await repository.deleteById(id);
  if (!deleted) {
    throw new PinnedInsightNotFoundError(id);
  }

  logger.info({ insightId: id }, "pinned_insight.unpin_completed");
}

export async function listPinnedInsights(
  projectId: string,
  userId: string,
): Promise<PinnedInsight[]> {
  await getProject(projectId, userId);
  return repository.findByProjectId(projectId);
}

export async function getMessagePinId(messageId: string): Promise<string | null> {
  const row = await repository.findByMessageId(messageId);
  return row?.id ?? null;
}
