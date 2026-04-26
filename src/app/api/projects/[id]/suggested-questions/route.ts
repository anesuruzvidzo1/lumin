import { type NextRequest, NextResponse } from "next/server";

import { handleApiError, unauthorizedResponse } from "@/core/api/errors";
import { createClient } from "@/core/supabase/server";
import { listDataSources } from "@/features/data-sources";
import { getSuggestedQuestionsForSources } from "@/features/suggested-questions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/[id]/suggested-questions
 * Returns up to 10 suggested questions across all ready data sources.
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

    const sources = await listDataSources(projectId, user.id);
    const readyIds = sources.filter((s) => s.status === "ready").map((s) => s.id);
    const questions = await getSuggestedQuestionsForSources(readyIds);

    return NextResponse.json({ questions });
  } catch (error) {
    return handleApiError(error);
  }
}
