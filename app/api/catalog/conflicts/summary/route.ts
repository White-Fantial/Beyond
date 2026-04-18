/**
 * GET /api/catalog/conflicts/summary
 *
 * Returns aggregate conflict counts for a connection.
 *
 * Query params:
 *   connectionId (required)
 */

import { NextRequest, NextResponse } from "next/server";
import { getConflictSummary } from "@/services/catalog-conflict.service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const connectionId = searchParams.get("connectionId");
  if (!connectionId) {
    return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
  }

  const summary = await getConflictSummary(connectionId);
  return NextResponse.json({ summary });
}
