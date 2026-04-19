/**
 * POST /api/catalog/conflicts/[conflictId]/resolve
 *
 * Records a resolution decision for a conflict.
 *
 * Body:
 *   {
 *     resolutionStrategy: "KEEP_INTERNAL" | "ACCEPT_EXTERNAL" | "MERGE_MANUALLY" | "DEFER" | "IGNORE",
 *     note?: string,
 *     userId?: string
 *   }
 *
 * NOTE: This endpoint only records the decision — it does NOT apply any data changes.
 * Actual sync execution is deferred to Phase 7.
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveConflict } from "@/services/catalog-conflict.service";
import type { CatalogConflictResolutionStrategy } from "@/types/catalog-conflicts";

const VALID_STRATEGIES: CatalogConflictResolutionStrategy[] = [
  "KEEP_INTERNAL",
  "ACCEPT_EXTERNAL",
  "MERGE_MANUALLY",
  "DEFER",
  "IGNORE",
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conflictId: string }> }
) {
  const { conflictId } = await params;
  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { resolutionStrategy, note, userId } = body;

  if (!resolutionStrategy || !VALID_STRATEGIES.includes(resolutionStrategy as CatalogConflictResolutionStrategy)) {
    return NextResponse.json(
      {
        error: `resolutionStrategy must be one of: ${VALID_STRATEGIES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  try {
    await resolveConflict({
      conflictId: conflictId,
      resolutionStrategy: resolutionStrategy as CatalogConflictResolutionStrategy,
      note,
      resolvedByUserId: userId,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
