/**
 * POST /api/catalog/publish/jobs/[jobId]/retry
 *
 * Retries a FAILED publish job.
 * Creates a new publish job using the same entity/action configuration.
 * The original job is marked CANCELLED.
 *
 * Required permissions: INTEGRATIONS + MENU_MANAGE
 */

import { NextRequest, NextResponse } from "next/server";
import { retryPublishJob } from "@/services/catalog-publish.service";

export async function POST(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const result = await retryPublishJob(params.jobId);
  const statusCode = result.status === "FAILED" ? 422 : 200;
  return NextResponse.json({ result }, { status: statusCode });
}
