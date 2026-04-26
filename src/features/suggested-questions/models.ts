import { suggestedQuestions } from "@/core/database/schema";

export type SuggestedQuestion = typeof suggestedQuestions.$inferSelect;
export type NewSuggestedQuestion = typeof suggestedQuestions.$inferInsert;

export { suggestedQuestions };
