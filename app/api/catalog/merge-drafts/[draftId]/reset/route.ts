/**
 * POST /api/catalog/merge-drafts/[draftId]/reset
 *
 * Resets a draft back to DRAFT status.
 */

import { NextRequest, NextResponse } from "next/server";
import { resetMergeDraft } from "@/services/catalog-merge.service";

export async function POST(
  _req: NextRequest,
  { params }: { params: { draftId: string } }
) {
  try {
    const draft = await resetMergeDraft(params.draftId);
    return NextResponse.json({ draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
