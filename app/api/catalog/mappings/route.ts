/**
 * GET /api/catalog/mappings?connectionId=&status=&entityType=&page=&perPage=
 *
 * Returns paginated catalog entity mappings for a connection.
 * Requires OWNER or MANAGER access.
 */

import { NextRequest, NextResponse } from "next/server";
import { listMappingsByConnection } from "@/services/catalog-mapping.service";
import type { CatalogEntityType, CatalogMappingStatus } from "@/types/catalog-mapping";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const connectionId = searchParams.get("connectionId");

  if (!connectionId) {
    return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
  }

  const status = searchParams.get("status") as CatalogMappingStatus | null;
  const entityType = searchParams.get("entityType") as CatalogEntityType | null;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const perPage = parseInt(searchParams.get("perPage") ?? "50", 10);

  const mappings = await listMappingsByConnection(connectionId, {
    status: status ?? undefined,
    entityType: entityType ?? undefined,
    page,
    perPage,
  });

  return NextResponse.json({ mappings });
}
