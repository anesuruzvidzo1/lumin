import { type NextRequest, NextResponse } from "next/server";

import { handleApiError, unauthorizedResponse } from "@/core/api/errors";
import { getLogger } from "@/core/logging";
import { createClient } from "@/core/supabase/server";
import {
  CreateConversationSchema,
  createConversation,
  listConversations,
} from "@/features/conversations";

const logger = getLogger("api.conversations");

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/[id]/conversations
 * List all conversations for a project.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return unauthorizedResponse();
    }

    logger.info({ projectId, userId: user.id }, "conversations.list_started");
    const convs = await listConversations(projectId, user.id);
    logger.info({ projectId, count: convs.length }, "conversations.list_completed");

    return NextResponse.json(convs);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/projects/[id]/conversations
 * Create a new conversation.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const input = CreateConversationSchema.parse(body);

    const conv = await createConversation(input, projectId, user.id);

    logger.info({ projectId, conversationId: conv.id }, "conversations.create_completed");

    return NextResponse.json(conv, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
