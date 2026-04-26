import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";

import { handleApiError, unauthorizedResponse } from "@/core/api/errors";
import { createClient } from "@/core/supabase/server";
import { AlreadyPinnedError, listPinnedInsights, pinInsight } from "@/features/pinned-insights";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const PinInsightSchema = z.object({
  messageId: z.string().uuid(),
  content: z.string().min(1),
  chartSpec: z.record(z.string(), z.unknown()).nullable().optional(),
});

/**
 * GET /api/projects/[id]/pinned-insights
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

    const insights = await listPinnedInsights(projectId, user.id);
    return NextResponse.json(insights);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/projects/[id]/pinned-insights
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
    const input = PinInsightSchema.parse(body);

    const insight = await pinInsight(
      projectId,
      input.messageId,
      input.content,
      input.chartSpec ?? null,
      user.id,
    );

    return NextResponse.json(insight, { status: 201 });
  } catch (error) {
    if (error instanceof AlreadyPinnedError) {
      return NextResponse.json({ error: "Already pinned" }, { status: 409 });
    }
    return handleApiError(error);
  }
}
