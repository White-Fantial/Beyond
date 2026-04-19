/**
 * POST /api/catalog/merge-drafts/[draftId]/apply
 *
 * Applies the merge draft by executing its generated sync plan.
 */

import { NextRequest, NextResponse } from "next/server";
import { applyMergeDraft } from "@/services/catalog-merge.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const { draftId } = await params;
  let userId: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    userId = (body as { userId?: string }).userId;
  } catch {
    // userId is optional
  }

  try {
    const result = await applyMergeDraft(draftId, { userId });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
