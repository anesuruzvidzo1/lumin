import { anomalyAlerts } from "@/core/database/schema";

export type AnomalyAlert = typeof anomalyAlerts.$inferSelect;
export type NewAnomalyAlert = typeof anomalyAlerts.$inferInsert;
export type AnomalyType = "outlier" | "missing_values" | "constant" | "spike";
export type AnomalySeverity = "low" | "medium" | "high";

export { anomalyAlerts };
