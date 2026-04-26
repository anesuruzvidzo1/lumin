import { type NextRequest, NextResponse } from "next/server";

import { handleApiError, unauthorizedResponse } from "@/core/api/errors";
import { getLogger } from "@/core/logging";
import { createClient } from "@/core/supabase/server";
import { deleteConversation, getConversation, getMessages } from "@/features/conversations";

const logger = getLogger("api.conversations");

interface RouteParams {
  params: Promise<{ id: string; conversationId: string }>;
}

/**
 * GET /api/projects/[id]/conversations/[conversationId]
 * Get a conversation with its full message history.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { conversationId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return unauthorizedResponse();
    }

    const [conv, msgs] = await Promise.all([
      getConversation(conversationId, user.id),
      getMessages(conversationId, user.id),
    ]);

    return NextResponse.json({ ...conv, messages: msgs });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/projects/[id]/conversations/[conversationId]
 * Delete a conversation and all its messages.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { conversationId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return unauthorizedResponse();
    }

    logger.info({ conversationId, userId: user.id }, "conversation.delete_started");
    await deleteConversation(conversationId, user.id);
    logger.info({ conversationId }, "conversation.delete_completed");

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
