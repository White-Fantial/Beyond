/**
 * POST /api/catalog/external-changes/[changeId]/ignore
 *
 * Marks an external change as IGNORED.
 */

import { NextRequest, NextResponse } from "next/server";
import { ignoreExternalChange } from "@/services/external-change-detection.service";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ changeId: string }> }
) {
  const { changeId } = await params;
  try {
    const change = await ignoreExternalChange(changeId);
    return NextResponse.json(change);
  } catch {
    return NextResponse.json({ error: "Change not found or could not be updated" }, { status: 404 });
  }
}
