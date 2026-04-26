import { z } from "zod/v4";

export const CreateConversationSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters")
    .trim(),
  /** IDs of data sources to include in the conversation context. */
  dataSourceIds: z.array(z.string().uuid()).min(1, "At least one data source is required"),
});

export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;

export const AskQuestionSchema = z.object({
  question: z
    .string()
    .min(1, "Question is required")
    .max(2000, "Question must be at most 2000 characters")
    .trim(),
});

export type AskQuestionInput = z.infer<typeof AskQuestionSchema>;
