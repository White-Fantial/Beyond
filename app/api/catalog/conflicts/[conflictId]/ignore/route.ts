/**
 * POST /api/catalog/conflicts/[conflictId]/ignore
 *
 * Moves a conflict to IGNORED status.
 */

import { NextRequest, NextResponse } from "next/server";
import { setConflictStatus } from "@/services/catalog-conflict.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conflictId: string }> }
) {
  const { conflictId } = await params;
  let body: Record<string, string> = {};
  try { body = await req.json(); } catch { /* ignore */ }

  try {
    await setConflictStatus({
      conflictId: conflictId,
      newStatus: "IGNORED",
      note: body.note,
      changedByUserId: body.userId,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
