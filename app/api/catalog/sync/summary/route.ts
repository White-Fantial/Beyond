/**
 * GET /api/catalog/sync/summary — sync summary for a connection
 *
 * Query params: connectionId
 */

import { NextRequest, NextResponse } from "next/server";
import { getSyncInboxSummary } from "@/services/catalog-sync-executor.service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const connectionId = searchParams.get("connectionId");
  if (!connectionId) {
    return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
  }

  const summary = await getSyncInboxSummary(connectionId);
  return NextResponse.json({ summary });
}
