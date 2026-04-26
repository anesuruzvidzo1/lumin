import { pinnedInsights } from "@/core/database/schema";

export type PinnedInsight = typeof pinnedInsights.$inferSelect;
export type NewPinnedInsight = typeof pinnedInsights.$inferInsert;

export { pinnedInsights };
