/**
 * POST /api/catalog/mappings/approve
 *
 * Approve a NEEDS_REVIEW mapping — promotes it to ACTIVE.
 *
 * Body: { mappingId: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { approveMappingLink } from "@/services/catalog-mapping.service";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { mappingId?: string };
  const { mappingId } = body;

  if (!mappingId) {
    return NextResponse.json({ error: "mappingId is required" }, { status: 400 });
  }

  try {
    const mapping = await approveMappingLink(mappingId);
    return NextResponse.json({ ok: true, mapping });
  } catch (err) {
    const message = err instanceof Error ? err.message : "approve failed";
    return NextResponse.json({ ok: false, error: message }, { status: 422 });
  }
}
