import { type NextRequest, NextResponse } from "next/server";

import { handleApiError, unauthorizedResponse } from "@/core/api/errors";
import { createClient } from "@/core/supabase/server";
import { unpinInsight } from "@/features/pinned-insights";

interface RouteParams {
  params: Promise<{ id: string; insightId: string }>;
}

/**
 * DELETE /api/projects/[id]/pinned-insights/[insightId]
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, insightId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return unauthorizedResponse();
    }

    await unpinInsight(insightId, projectId, user.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
