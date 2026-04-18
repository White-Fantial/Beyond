/**
 * POST /api/catalog/mappings/validate
 *
 * Validates all non-archived mappings for a connection.
 * Sets status to BROKEN for any mapping where internal or external entity
 * is missing/invalid.
 *
 * Body: { connectionId: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { validateMappings } from "@/services/catalog-mapping.service";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { connectionId?: string };
  const { connectionId } = body;

  if (!connectionId) {
    return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
  }

  try {
    const result = await validateMappings(connectionId);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "validation failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
