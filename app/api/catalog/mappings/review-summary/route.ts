/**
 * GET /api/catalog/mappings/review-summary?connectionId=
 *
 * Returns ACTIVE / NEEDS_REVIEW / UNMATCHED / BROKEN counts for a connection,
 * both in total and broken down by entity type.
 */

import { NextRequest, NextResponse } from "next/server";
import { getMappingReviewSummary } from "@/services/catalog-mapping.service";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const connectionId = searchParams.get("connectionId");

  if (!connectionId) {
    return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
  }

  const summary = await getMappingReviewSummary(connectionId);
  return NextResponse.json({ summary });
}
