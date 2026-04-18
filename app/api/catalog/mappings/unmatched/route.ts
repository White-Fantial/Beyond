/**
 * GET /api/catalog/mappings/unmatched?connectionId=&entityType=
 *
 * Returns external entities that have no active internal mapping.
 */

import { NextRequest, NextResponse } from "next/server";
import { listUnmatchedExternalEntities } from "@/services/catalog-mapping.service";
import type { CatalogEntityType } from "@/types/catalog-mapping";

const VALID_ENTITY_TYPES: CatalogEntityType[] = [
  "CATEGORY",
  "PRODUCT",
  "MODIFIER_GROUP",
  "MODIFIER_OPTION",
];

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const connectionId = searchParams.get("connectionId");
  const entityType = searchParams.get("entityType") as CatalogEntityType | null;

  if (!connectionId) {
    return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
  }
  if (!entityType || !VALID_ENTITY_TYPES.includes(entityType)) {
    return NextResponse.json(
      { error: `entityType must be one of: ${VALID_ENTITY_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  const items = await listUnmatchedExternalEntities(connectionId, entityType);
  return NextResponse.json({ items });
}
