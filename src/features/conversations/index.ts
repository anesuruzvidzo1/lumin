// Errors
export type { ConversationErrorCode } from "./errors";
export {
  ConversationAccessDeniedError,
  ConversationAiFailedError,
  ConversationError,
  ConversationNotFoundError,
} from "./errors";

// Models / types
export type { Conversation, Message, MessageRole, NewConversation, NewMessage } from "./models";

// Schemas
export type { AskQuestionInput, CreateConversationInput } from "./schemas";
export { AskQuestionSchema, CreateConversationSchema } from "./schemas";

// Service functions (public API)
export {
  askQuestion,
  createConversation,
  deleteConversation,
  getConversation,
  getMessages,
  listConversations,
} from "./service";
