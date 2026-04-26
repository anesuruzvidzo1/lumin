import { getLogger } from "@/core/logging";
import { getProject } from "@/features/projects";

import { detectAnomalies } from "./analyzer";
import type { AnomalyAlert } from "./models";
import * as repository from "./repository";

const logger = getLogger("anomaly-detection.service");

/**
 * Run anomaly detection on ingested rows and store results.
 * Called after ingestion completes; non-fatal on error.
 */
export async function scanAndStoreAnomalies(
  dataSourceId: string,
  projectId: string,
  rows: Record<string, unknown>[],
): Promise<AnomalyAlert[]> {
  logger.info({ dataSourceId, rowCount: rows.length }, "anomaly.scan_started");

  try {
    const alerts = detectAnomalies(rows, projectId, dataSourceId);
    if (alerts.length === 0) {
      logger.info({ dataSourceId }, "anomaly.scan_completed_no_alerts");
      return [];
    }
    const stored = await repository.createMany(alerts);
    logger.info({ dataSourceId, alertCount: stored.length }, "anomaly.scan_completed");
    return stored;
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    logger.error({ dataSourceId, cause }, "anomaly.scan_failed");
    return [];
  }
}

export async function listAnomalyAlerts(
  projectId: string,
  userId: string,
): Promise<AnomalyAlert[]> {
  await getProject(projectId, userId);
  return repository.findByProjectId(projectId);
}
