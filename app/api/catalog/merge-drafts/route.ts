/**
 * GET  /api/catalog/merge-drafts  — list drafts for a connection
 * POST /api/catalog/merge-drafts  — create draft from conflict
 */

import { NextRequest, NextResponse } from "next/server";
import {
  listMergeDrafts,
  createMergeDraftFromConflict,
} from "@/services/catalog-merge.service";
import type { CatalogMergeDraftStatus, CatalogEntityType } from "@/types/catalog-merge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const connectionId = searchParams.get("connectionId");
  if (!connectionId) {
    return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
  }

  const status         = searchParams.get("status") as CatalogMergeDraftStatus | null;
  const entityType     = searchParams.get("internalEntityType") as CatalogEntityType | null;
  const entityId       = searchParams.get("internalEntityId") ?? undefined;
  const limit          = parseInt(searchParams.get("limit")  ?? "50", 10);
  const offset         = parseInt(searchParams.get("offset") ?? "0",  10);

  const drafts = await listMergeDrafts({
    connectionId,
    ...(status     ? { status }                         : {}),
    ...(entityType ? { internalEntityType: entityType } : {}),
    ...(entityId   ? { internalEntityId: entityId }     : {}),
    limit,
    offset,
  });

  return NextResponse.json({ drafts });
}

export async function POST(req: NextRequest) {
  let body: { conflictId?: string; userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { conflictId, userId } = body;
  if (!conflictId) {
    return NextResponse.json({ error: "conflictId is required" }, { status: 400 });
  }

  try {
    const draft = await createMergeDraftFromConflict(conflictId, userId);
    return NextResponse.json({ draft }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
