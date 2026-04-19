/**
 * GET /api/catalog/publish/jobs/[jobId]
 *
 * Returns details for a single publish job.
 *
 * Required permissions: INTEGRATIONS or MENU_MANAGE
 */

import { NextRequest, NextResponse } from "next/server";
import { getPublishJob } from "@/services/catalog-publish.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = await getPublishJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Publish job not found." }, { status: 404 });
  }
  return NextResponse.json({ job });
}
