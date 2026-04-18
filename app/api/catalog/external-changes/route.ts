/**
 * GET /api/catalog/external-changes
 *
 * Lists external catalog changes with optional filters.
 *
 * Query params:
 *   connectionId (required)
 *   status, entityType, changeKind, mappedOnly, limit, offset
 */

import { NextRequest, NextResponse } from "next/server";
import { listExternalChanges } from "@/services/external-change-detection.service";
import type {
  ExternalCatalogChangeStatus,
  CatalogEntityType,
  ExternalCatalogChangeKind,
} from "@/types/catalog-external-changes";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const connectionId = searchParams.get("connectionId");
  if (!connectionId) {
    return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
  }

  const status = searchParams.get("status") as ExternalCatalogChangeStatus | null;
  const entityType = searchParams.get("entityType") as CatalogEntityType | null;
  const changeKind = searchParams.get("changeKind") as ExternalCatalogChangeKind | null;
  const mappedOnly = searchParams.get("mappedOnly") === "true";
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  const changes = await listExternalChanges({
    connectionId,
    ...(status ? { status } : {}),
    ...(entityType ? { entityType } : {}),
    ...(changeKind ? { changeKind } : {}),
    mappedOnly,
    limit,
    offset,
  });

  return NextResponse.json({ changes });
}
