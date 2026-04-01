/**
 * POST /api/admin/jobs/run
 *
 * Creates and executes a manual job run. PLATFORM_ADMIN only.
 * Blocked during impersonation.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminNotImpersonating } from "@/lib/admin/auth-guard";
import { createManualJobRun } from "@/services/admin/admin-job.service";
import { canManuallyRunJobType } from "@/lib/admin/jobs/guards";
import type { ManualJobRunInput, JobType } from "@/types/admin-jobs";

export async function POST(req: NextRequest) {
  let ctx: Awaited<ReturnType<typeof requirePlatformAdminNotImpersonating>>;
  try {
    ctx = await requirePlatformAdminNotImpersonating();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    if (msg.startsWith("impersonation_active")) {
      return NextResponse.json(
        { error: "Exit impersonation first before performing admin job actions." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ManualJobRunInput;
  try {
    body = (await req.json()) as ManualJobRunInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { jobType } = body;

  if (!jobType) {
    return NextResponse.json({ error: "jobType is required." }, { status: 400 });
  }

  if (!canManuallyRunJobType(jobType as JobType)) {
    return NextResponse.json(
      { error: `Job type ${jobType} is not allowed for manual run.` },
      { status: 400 }
    );
  }

  try {
    const detail = await createManualJobRun(body, ctx.userId);
    return NextResponse.json({ id: detail.id, status: detail.status }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Job execution failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
