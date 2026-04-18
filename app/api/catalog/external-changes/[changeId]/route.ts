/**
 * GET /api/catalog/external-changes/[changeId]
 *
 * Returns full detail of a single ExternalCatalogChange including field diffs.
 */

import { NextRequest, NextResponse } from "next/server";
import { getExternalChange } from "@/services/external-change-detection.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: { changeId: string } }
) {
  const change = await getExternalChange(params.changeId);
  if (!change) {
    return NextResponse.json({ error: "Change not found" }, { status: 404 });
  }
  return NextResponse.json(change);
}
