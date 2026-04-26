import type { AnomalySeverity, AnomalyType, NewAnomalyAlert } from "./models";

interface DetectedAnomaly {
  columnName: string;
  type: AnomalyType;
  description: string;
  severity: AnomalySeverity;
}

function parsedNums(values: unknown[]): number[] {
  return values
    .map((v) => {
      const n = Number(String(v).replace(/[,$%]/g, ""));
      return Number.isFinite(n) ? n : null;
    })
    .filter((n): n is number => n !== null);
}

function mean(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function stdDev(nums: number[], avg: number): number {
  const variance = nums.reduce((a, b) => a + (b - avg) ** 2, 0) / nums.length;
  return Math.sqrt(variance);
}

function checkMissing(col: string, values: unknown[]): DetectedAnomaly | null {
  const missing = values.filter((v) => v === null || v === undefined || v === "").length;
  const pct = missing / values.length;
  if (pct < 0.5) {
    return null;
  }
  return {
    columnName: col,
    type: "missing_values",
    description: `${Math.round(pct * 100)}% of values in "${col}" are empty or null.`,
    severity: pct >= 0.8 ? "high" : "medium",
  };
}

function checkConstant(
  col: string,
  _nums: number[],
  avg: number,
  sd: number,
): DetectedAnomaly | null {
  if (sd !== 0) {
    return null;
  }
  return {
    columnName: col,
    type: "constant",
    description: `All values in "${col}" are identical (${avg}).`,
    severity: "low",
  };
}

function checkOutliers(
  col: string,
  nums: number[],
  avg: number,
  sd: number,
): DetectedAnomaly | null {
  const outliers = nums.filter((n) => Math.abs(n - avg) > 3 * sd);
  if (outliers.length === 0) {
    return null;
  }
  const pct = Math.round((outliers.length / nums.length) * 100);
  const extremes = outliers
    .sort((a, b) => Math.abs(b - avg) - Math.abs(a - avg))
    .slice(0, 3)
    .map((n) => n.toLocaleString())
    .join(", ");
  return {
    columnName: col,
    type: "outlier",
    description: `${pct}% of values in "${col}" are statistical outliers (>3σ from mean ${avg.toFixed(1)}). Extreme values: ${extremes}.`,
    severity: outliers.length >= 3 ? "high" : "medium",
  };
}

function checkSpikes(col: string, nums: number[]): DetectedAnomaly | null {
  if (nums.length < 10) {
    return null;
  }
  const diffs = nums.slice(1).map((n, i) => n - (nums[i] ?? 0));
  const diffMean = diffs.reduce((a, b) => a + Math.abs(b), 0) / diffs.length;
  const diffSd = Math.sqrt(
    diffs.reduce((a, b) => a + (Math.abs(b) - diffMean) ** 2, 0) / diffs.length,
  );
  if (diffSd === 0) {
    return null;
  }
  const bigJumps = diffs.filter((d) => Math.abs(d) > diffMean + 3 * diffSd);
  if (bigJumps.length === 0) {
    return null;
  }
  return {
    columnName: col,
    type: "spike",
    description: `"${col}" has ${bigJumps.length} sudden spike${bigJumps.length === 1 ? "" : "s"} or drops in sequential values.`,
    severity: "medium",
  };
}

function analyzeColumn(col: string, values: unknown[]): DetectedAnomaly | null {
  const missingAlert = checkMissing(col, values);
  if (missingAlert) {
    return missingAlert;
  }

  const nums = parsedNums(values);
  if (nums.length < values.length * 0.6 || nums.length < 3) {
    return null;
  }

  const avg = mean(nums);
  const sd = stdDev(nums, avg);

  return (
    checkConstant(col, nums, avg, sd) ?? checkOutliers(col, nums, avg, sd) ?? checkSpikes(col, nums)
  );
}

/**
 * Scan rows for statistical anomalies in numeric columns.
 * Returns a list of detected issues suitable for storing as alerts.
 */
export function detectAnomalies(
  rows: Record<string, unknown>[],
  projectId: string,
  dataSourceId: string,
): NewAnomalyAlert[] {
  if (rows.length < 5) {
    return [];
  }

  const columns = Object.keys(rows[0] ?? {});
  const detected: DetectedAnomaly[] = [];

  for (const col of columns) {
    const values = rows.map((r) => r[col]);
    const anomaly = analyzeColumn(col, values);
    if (anomaly) {
      detected.push(anomaly);
    }
  }

  return detected.slice(0, 10).map((a) => ({
    projectId,
    dataSourceId,
    columnName: a.columnName,
    type: a.type,
    description: a.description,
    severity: a.severity,
  }));
}
