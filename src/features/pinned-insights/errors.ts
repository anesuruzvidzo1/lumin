export class PinnedInsightError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "PinnedInsightError";
  }
}

export class PinnedInsightNotFoundError extends PinnedInsightError {
  constructor(id: string) {
    super(`Pinned insight not found: ${id}`, "PINNED_INSIGHT_NOT_FOUND", 404);
  }
}

export class PinnedInsightAccessDeniedError extends PinnedInsightError {
  constructor(id: string) {
    super(`Access denied to pinned insight: ${id}`, "PINNED_INSIGHT_ACCESS_DENIED", 403);
  }
}

export class AlreadyPinnedError extends PinnedInsightError {
  constructor(messageId: string) {
    super(`Message already pinned: ${messageId}`, "ALREADY_PINNED", 409);
  }
}
