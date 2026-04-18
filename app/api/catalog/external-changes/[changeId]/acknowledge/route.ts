/**
 * POST /api/catalog/external-changes/[changeId]/acknowledge
 *
 * Marks an external change as ACKNOWLEDGED.
 */

import { NextRequest, NextResponse } from "next/server";
import { acknowledgeExternalChange } from "@/services/external-change-detection.service";

export async function POST(
  _req: NextRequest,
  { params }: { params: { changeId: string } }
) {
  try {
    const change = await acknowledgeExternalChange(params.changeId);
    return NextResponse.json(change);
  } catch {
    return NextResponse.json({ error: "Change not found or could not be updated" }, { status: 404 });
  }
}
