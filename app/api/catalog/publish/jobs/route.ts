/**
 * GET /api/catalog/publish/jobs
 *
 * Returns a paginated list of catalog publish jobs.
 *
 * Query params:
 *   connectionId (required)
 *   status?          (CatalogPublishStatus)
 *   internalEntityType?
 *   internalEntityId?
 *   limit?           (default 50)
 *   offset?          (default 0)
 *
 * Required permissions: INTEGRATIONS or MENU_MANAGE
 */

import { NextRequest, NextResponse } from "next/server";
import { getPublishJobs } from "@/services/catalog-publish.service";
import type { CatalogPublishStatus, CatalogEntityType } from "@/types/catalog-publish";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const connectionId = searchParams.get("connectionId");

  if (!connectionId) {
    return NextResponse.json({ error: "connectionId is required." }, { status: 400 });
  }

  const status = searchParams.get("status") as CatalogPublishStatus | null;
  const internalEntityType = searchParams.get("internalEntityType") as CatalogEntityType | null;
  const internalEntityId = searchParams.get("internalEntityId");
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  const jobs = await getPublishJobs({
    connectionId,
    status: status ?? undefined,
    internalEntityType: internalEntityType ?? undefined,
    internalEntityId: internalEntityId ?? undefined,
    limit: isNaN(limit) ? 50 : limit,
    offset: isNaN(offset) ? 0 : offset,
  });

  return NextResponse.json({ jobs });
}
