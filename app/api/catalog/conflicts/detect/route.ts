/**
 * POST /api/catalog/conflicts/detect
 *
 * Triggers conflict detection for a connection or a single external change.
 *
 * Body (one of):
 *   { connectionId: string }
 *   { externalChangeId: string }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  detectConflictsForConnection,
  detectConflictsForExternalChange,
} from "@/services/catalog-conflict.service";

export async function POST(req: NextRequest) {
  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.connectionId) {
    const result = await detectConflictsForConnection(body.connectionId);
    const status = result.status === "FAILED" ? 500 : 200;
    return NextResponse.json(result, { status });
  }

  if (body.externalChangeId) {
    const result = await detectConflictsForExternalChange(body.externalChangeId);
    const status = result.status === "FAILED" ? 500 : 200;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(
    { error: "Either connectionId or externalChangeId is required" },
    { status: 400 }
  );
}
