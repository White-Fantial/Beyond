/**
 * GET /api/catalog/merge-drafts/[draftId]/preview
 *
 * Returns a preview of the draft: resolved values + validation + plan summary.
 */

import { NextRequest, NextResponse } from "next/server";
import { previewMergeDraft } from "@/services/catalog-merge.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const { draftId } = await params;
  try {
    const preview = await previewMergeDraft(draftId);
    return NextResponse.json({ preview });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
