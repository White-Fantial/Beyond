/**
 * POST /api/catalog/merge-drafts/[draftId]/structures
 *
 * Upsert a structure-level merge choice.
 */

import { NextRequest, NextResponse } from "next/server";
import { upsertMergeStructureChoice } from "@/services/catalog-merge.service";

export async function POST(
  req: NextRequest,
  { params }: { params: { draftId: string } }
) {
  let body: {
    fieldPath?: string;
    choice?: string;
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
    const structure = await upsertMergeStructureChoice({
      draftId: params.draftId,
      fieldPath,
      choice,
      customValue,
      note,
    });
    return NextResponse.json({ structure });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
