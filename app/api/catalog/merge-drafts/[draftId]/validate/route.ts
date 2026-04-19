/**
 * POST /api/catalog/merge-drafts/[draftId]/validate
 *
 * Validates a draft and updates its status to VALIDATED or INVALID.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateMergeDraft } from "@/services/catalog-merge.service";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const { draftId } = await params;
  try {
    const result = await validateMergeDraft(draftId);
    return NextResponse.json({ validation: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
