/**
 * GET /api/catalog/external-changes/summary?connectionId=
 *
 * Returns aggregated summary of open external changes for a connection.
 */

import { NextRequest, NextResponse } from "next/server";
import { getExternalChangeSummary } from "@/services/external-change-detection.service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const connectionId = searchParams.get("connectionId");

  if (!connectionId) {
    return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
  }

  const summary = await getExternalChangeSummary(connectionId);
  return NextResponse.json(summary);
}
