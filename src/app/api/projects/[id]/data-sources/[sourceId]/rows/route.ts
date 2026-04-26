import { type NextRequest, NextResponse } from "next/server";

import { handleApiError, unauthorizedResponse } from "@/core/api/errors";
import { getLogger } from "@/core/logging";
import { createClient } from "@/core/supabase/server";
import { getDataSource } from "@/features/data-sources";
import { getRows, getSampleRows } from "@/features/ingestion";

const logger = getLogger("api.data-source-rows");

interface RouteParams {
  params: Promise<{ id: string; sourceId: string }>;
}

/**
 * GET /api/projects/[id]/data-sources/[sourceId]/rows
 *
 * Query params:
 *   sample=true          → return the first 50 rows (for AI context)
 *   limit=N              → page size (default 100, max 500)
 *   offset=N             → skip N rows
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { sourceId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return unauthorizedResponse();
    }

    // Verify the data source exists and the user can access it
    await getDataSource(sourceId, user.id);

    const searchParams = request.nextUrl.searchParams;
    const sample = searchParams.get("sample") === "true";

    if (sample) {
      logger.info({ dataSourceId: sourceId }, "data_source_rows.sample_started");
      const rows = await getSampleRows(sourceId);
      logger.info(
        { dataSourceId: sourceId, count: rows.length },
        "data_source_rows.sample_completed",
      );
      return NextResponse.json({ rows });
    }

    const rawLimit = searchParams.get("limit");
    const rawOffset = searchParams.get("offset");
    const limit = Math.min(rawLimit ? Number(rawLimit) : 100, 500);
    const offset = rawOffset ? Number(rawOffset) : 0;

    logger.info({ dataSourceId: sourceId, limit, offset }, "data_source_rows.list_started");
    const rows = await getRows(sourceId, { limit, offset });
    logger.info({ dataSourceId: sourceId, count: rows.length }, "data_source_rows.list_completed");

    return NextResponse.json({ rows, limit, offset });
  } catch (error) {
    return handleApiError(error);
  }
}
