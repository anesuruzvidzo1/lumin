import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import { conversations, messages } from "@/core/database/schema";

export { conversations, messages };

export type Conversation = InferSelectModel<typeof conversations>;
export type NewConversation = InferInsertModel<typeof conversations>;

export type Message = InferSelectModel<typeof messages>;
export type NewMessage = InferInsertModel<typeof messages>;

export type MessageRole = "user" | "assistant";
