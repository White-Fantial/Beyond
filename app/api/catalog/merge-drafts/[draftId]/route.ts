/**
 * GET   /api/catalog/merge-drafts/[draftId]  — get single draft
 * PATCH /api/catalog/merge-drafts/[draftId]  — update metadata / applyTarget
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getMergeDraft,
  updateMergeDraftMetadata,
  setMergeApplyTarget,
} from "@/services/catalog-merge.service";
import type { CatalogMergeApplyTarget } from "@/types/catalog-merge";

export async function GET(
  _req: NextRequest,
  { params }: { params: { draftId: string } }
) {
  const draft = await getMergeDraft(params.draftId);
  if (!draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }
  return NextResponse.json({ draft });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { draftId: string } }
) {
  let body: {
    title?: string;
    summary?: string;
    applyTarget?: CatalogMergeApplyTarget;
    updatedByUserId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { draftId } = params;

  try {
    if (body.applyTarget !== undefined) {
      const draft = await setMergeApplyTarget({
        draftId,
        applyTarget: body.applyTarget,
        updatedByUserId: body.updatedByUserId,
      });
      return NextResponse.json({ draft });
    }

    const draft = await updateMergeDraftMetadata({
      draftId,
      title: body.title,
      summary: body.summary,
      updatedByUserId: body.updatedByUserId,
    });
    return NextResponse.json({ draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
