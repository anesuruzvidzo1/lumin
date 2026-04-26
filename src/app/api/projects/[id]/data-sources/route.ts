import { type NextRequest, NextResponse } from "next/server";

import { handleApiError, unauthorizedResponse } from "@/core/api/errors";
import { getLogger } from "@/core/logging";
import { createClient } from "@/core/supabase/server";
import { CreateDataSourceSchema, createDataSource, listDataSources } from "@/features/data-sources";

const logger = getLogger("api.data-sources");

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/[id]/data-sources
 * List all data sources for a project.
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

    logger.info({ projectId, userId: user.id }, "data_sources.list_started");
    const sources = await listDataSources(projectId, user.id);
    logger.info({ projectId, count: sources.length }, "data_sources.list_completed");

    return NextResponse.json(sources);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/projects/[id]/data-sources
 * Upload a new data source file.
 * Accepts multipart/form-data with fields: name (string), file (File).
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

    const formData = await request.formData();
    const rawName = formData.get("name");
    const rawFile = formData.get("file");

    if (!rawFile || !(rawFile instanceof File)) {
      return NextResponse.json(
        { error: "No file provided", code: "MISSING_FILE" },
        { status: 400 },
      );
    }

    // Use filename as fallback name if not provided
    const nameValue = typeof rawName === "string" && rawName.trim() ? rawName.trim() : rawFile.name;
    const input = CreateDataSourceSchema.parse({ name: nameValue });

    logger.info(
      { projectId, userId: user.id, name: input.name, size: rawFile.size },
      "data_source.upload_started",
    );

    const source = await createDataSource(input, rawFile, projectId, user.id);

    logger.info({ projectId, dataSourceId: source.id }, "data_source.upload_completed");

    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
