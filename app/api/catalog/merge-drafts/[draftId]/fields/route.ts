/**
 * POST /api/catalog/merge-drafts/[draftId]/fields
 *
 * Upsert a field-level merge choice.
 */

import { NextRequest, NextResponse } from "next/server";
import { upsertMergeFieldChoice } from "@/services/catalog-merge.service";
import type { CatalogMergeFieldChoice } from "@/types/catalog-merge";

export async function POST(
  req: NextRequest,
  { params }: { params: { draftId: string } }
) {
  const { draftId } = params;
  let body: {
    fieldPath?: string;
    choice?: CatalogMergeFieldChoice;
    customValue?: unknown;
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { fieldPath, choice, customValue, note } = body;
  if (!fieldPath || !choice) {
    return NextResponse.json({ error: "fieldPath and choice are required" }, { status: 400 });
  }

  try {
    const field = await upsertMergeFieldChoice({
      draftId: draftId,
      fieldPath,
      choice,
      customValue,
      note,
    });
    return NextResponse.json({ field });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
