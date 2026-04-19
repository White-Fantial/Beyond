/**
 * POST /api/catalog/merge-drafts/[draftId]/generate-plan
 *
 * Generates a CatalogSyncPlan from a validated merge draft.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateSyncPlanFromMergeDraft } from "@/services/catalog-merge.service";

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
    const planId = await generateSyncPlanFromMergeDraft(draftId, userId);
    return NextResponse.json({ planId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
