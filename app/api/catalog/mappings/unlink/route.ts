/**
 * POST /api/catalog/mappings/unlink
 *
 * Archives an existing mapping (sets status to ARCHIVED).
 *
 * Body: { mappingId: string, reason?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { unlinkMapping } from "@/services/catalog-mapping.service";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { mappingId?: string; reason?: string };
  const { mappingId, reason } = body;

  if (!mappingId) {
    return NextResponse.json({ error: "mappingId is required" }, { status: 400 });
  }

  try {
    const mapping = await unlinkMapping({ mappingId, reason });
    return NextResponse.json({ ok: true, mapping });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unlink failed";
    return NextResponse.json({ ok: false, error: message }, { status: 422 });
  }
}
