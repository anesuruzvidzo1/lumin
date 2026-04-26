import type { HttpStatusCode } from "@/core/api/errors";

export type ConversationErrorCode =
  | "CONVERSATION_NOT_FOUND"
  | "CONVERSATION_ACCESS_DENIED"
  | "CONVERSATION_AI_FAILED";

export class ConversationError extends Error {
  readonly code: ConversationErrorCode;
  readonly statusCode: HttpStatusCode;

  constructor(message: string, code: ConversationErrorCode, statusCode: HttpStatusCode) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ConversationNotFoundError extends ConversationError {
  constructor(id: string) {
    super(`Conversation not found: ${id}`, "CONVERSATION_NOT_FOUND", 404);
  }
}

export class ConversationAccessDeniedError extends ConversationError {
  constructor(id: string) {
    super(`Access denied to conversation: ${id}`, "CONVERSATION_ACCESS_DENIED", 403);
  }
}

export class ConversationAiFailedError extends ConversationError {
  constructor(cause: string) {
    super(`AI query failed: ${cause}`, "CONVERSATION_AI_FAILED", 500);
  }
}
