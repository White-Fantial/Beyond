/**
 * GET /api/catalog/external-changes/[changeId]
 *
 * Returns full detail of a single ExternalCatalogChange including field diffs.
 */

import { NextRequest, NextResponse } from "next/server";
import { getExternalChange } from "@/services/external-change-detection.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ changeId: string }> }
) {
  const { changeId } = await params;
  const change = await getExternalChange(changeId);
  if (!change) {
    return NextResponse.json({ error: "Change not found" }, { status: 404 });
  }
  return NextResponse.json(change);
}
