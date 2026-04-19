/**
 * GET /api/catalog/conflicts/[conflictId]
 *
 * Returns full details of a single conflict.
 */

import { NextRequest, NextResponse } from "next/server";
import { getConflictById } from "@/services/catalog-conflict.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ conflictId: string }> }
) {
  const { conflictId } = await params;
  const conflict = await getConflictById(conflictId);
  if (!conflict) {
    return NextResponse.json({ error: "Conflict not found" }, { status: 404 });
  }
  return NextResponse.json({ conflict });
}
