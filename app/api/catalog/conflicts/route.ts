/**
 * GET /api/catalog/conflicts
 *
 * Lists catalog conflicts with optional filters.
 *
 * Query params:
 *   connectionId (required)
 *   status, entityType, conflictType, internalEntityId, mappedOnly, limit, offset
 */

import { NextRequest, NextResponse } from "next/server";
import { listConflicts } from "@/services/catalog-conflict.service";
import type {
  CatalogConflictStatus,
  CatalogConflictType,
  CatalogEntityType,
} from "@/types/catalog-conflicts";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const connectionId = searchParams.get("connectionId");
  if (!connectionId) {
    return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
  }

  const status           = searchParams.get("status") as CatalogConflictStatus | null;
  const entityType       = searchParams.get("entityType") as CatalogEntityType | null;
  const conflictType     = searchParams.get("conflictType") as CatalogConflictType | null;
  const internalEntityId = searchParams.get("internalEntityId") ?? undefined;
  const mappedOnly       = searchParams.get("mappedOnly") === "true";
  const limit            = parseInt(searchParams.get("limit") ?? "50", 10);
  const offset           = parseInt(searchParams.get("offset") ?? "0", 10);

  const conflicts = await listConflicts({
    connectionId,
    ...(status           ? { status }           : {}),
    ...(entityType       ? { entityType }       : {}),
    ...(conflictType     ? { conflictType }     : {}),
    ...(internalEntityId ? { internalEntityId } : {}),
    mappedOnly,
    limit,
    offset,
  });

  return NextResponse.json({ conflicts });
}
