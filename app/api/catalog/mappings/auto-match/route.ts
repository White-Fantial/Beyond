/**
 * POST /api/catalog/mappings/auto-match
 *
 * Triggers auto-match for all external entities in the specified connection.
 * Only processes external entities that don't already have a non-archived mapping.
 *
 * Body: { connectionId: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { autoMatchExternalEntities } from "@/services/catalog-mapping.service";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { connectionId?: string };
  const { connectionId } = body;

  if (!connectionId) {
    return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
  }

  try {
    const result = await autoMatchExternalEntities(connectionId);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "auto-match failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
