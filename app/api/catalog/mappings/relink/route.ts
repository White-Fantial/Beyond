/**
 * POST /api/catalog/mappings/relink
 *
 * Change the internal entity that a mapping points to.
 * Archives the old mapping and creates a new NEEDS_REVIEW mapping.
 *
 * Body: { mappingId: string, newInternalEntityId: string, notes?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { relinkEntity } from "@/services/catalog-mapping.service";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    mappingId?: string;
    newInternalEntityId?: string;
    notes?: string;
  };

  const { mappingId, newInternalEntityId, notes } = body;

  if (!mappingId || !newInternalEntityId) {
    return NextResponse.json(
      { error: "mappingId and newInternalEntityId are required" },
      { status: 400 }
    );
  }

  try {
    const mapping = await relinkEntity({ mappingId, newInternalEntityId, notes });
    return NextResponse.json({ ok: true, mapping });
  } catch (err) {
    const message = err instanceof Error ? err.message : "relink failed";
    return NextResponse.json({ ok: false, error: message }, { status: 422 });
  }
}
