/**
 * POST /api/catalog/external-changes/detect
 *
 * Triggers external change detection for a completed import run.
 * Body: { importRunId: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { detectExternalChangesForImportRun } from "@/services/external-change-detection.service";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { importRunId?: string };
  const { importRunId } = body;

  if (!importRunId) {
    return NextResponse.json({ error: "importRunId is required" }, { status: 400 });
  }

  const result = await detectExternalChangesForImportRun({ importRunId });

  return NextResponse.json(result, { status: result.diffStatus === "SUCCEEDED" ? 200 : 500 });
}
