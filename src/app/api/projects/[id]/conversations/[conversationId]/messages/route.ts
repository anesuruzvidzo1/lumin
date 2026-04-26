import { type NextRequest, NextResponse } from "next/server";

import { handleApiError, unauthorizedResponse } from "@/core/api/errors";
import { getLogger } from "@/core/logging";
import { createClient } from "@/core/supabase/server";
import { AskQuestionSchema, askQuestion } from "@/features/conversations";

const logger = getLogger("api.conversations");

interface RouteParams {
  params: Promise<{ id: string; conversationId: string }>;
}

/**
 * POST /api/projects/[id]/conversations/[conversationId]/messages
 * Send a question and receive the AI answer.
 *
 * Body: { question: string }
 * Returns: the assistant Message record (with optional chartSpec).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { conversationId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const input = AskQuestionSchema.parse(body);

    logger.info({ conversationId, userId: user.id }, "conversation.ask_started");

    const message = await askQuestion(conversationId, input, user.id);

    logger.info({ conversationId, messageId: message.id }, "conversation.ask_completed");

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
