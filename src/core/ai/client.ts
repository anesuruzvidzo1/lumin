import Anthropic from "@anthropic-ai/sdk";

import { env } from "@/core/config/env";

/**
 * Shared Anthropic client for server-side use only.
 * Never import this in client components.
 */
export const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export const AI_MODEL = "claude-sonnet-4-6" as const;

/** Max tokens for a single AI response. */
export const MAX_RESPONSE_TOKENS = 4096;

/** Number of sample rows passed to the AI as context. */
export const CONTEXT_SAMPLE_ROWS = 50;
