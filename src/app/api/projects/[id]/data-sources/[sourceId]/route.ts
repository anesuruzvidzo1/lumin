import { type NextRequest, NextResponse } from "next/server";

import { handleApiError, unauthorizedResponse } from "@/core/api/errors";
import { getLogger } from "@/core/logging";
import { createClient } from "@/core/supabase/server";
import { deleteDataSource, getDataSource } from "@/features/data-sources";

const logger = getLogger("api.data-sources");

interface RouteParams {
  params: Promise<{ id: string; sourceId: string }>;
}

/**
 * GET /api/projects/[id]/data-sources/[sourceId]
 * Get a single data source.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { sourceId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return unauthorizedResponse();
    }

    logger.info({ dataSourceId: sourceId, userId: user.id }, "data_source.get_started");
    const source = await getDataSource(sourceId, user.id);
    logger.info({ dataSourceId: sourceId }, "data_source.get_completed");

    return NextResponse.json(source);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/projects/[id]/data-sources/[sourceId]
 * Delete a data source and its stored file.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { sourceId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return unauthorizedResponse();
    }

    logger.info({ dataSourceId: sourceId, userId: user.id }, "data_source.delete_started");
    await deleteDataSource(sourceId, user.id);
    logger.info({ dataSourceId: sourceId }, "data_source.delete_completed");

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
