/**
 * POST /api/admin/jobs/[jobRunId]/retry
 *
 * Retries a failed job run by creating a new JobRun with parentRunId set.
 * PLATFORM_ADMIN only. Blocked during impersonation.
 */
import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminNotImpersonating } from "@/lib/admin/auth-guard";
import { retryAdminJobRun } from "@/services/admin/admin-job.service";

interface RouteParams {
  params: { jobRunId: string };
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
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

  const { jobRunId } = params;

  if (!jobRunId) {
    return NextResponse.json({ error: "jobRunId is required." }, { status: 400 });
  }

  try {
    const detail = await retryAdminJobRun(jobRunId, ctx.userId);
    return NextResponse.json({ id: detail.id, status: detail.status }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Retry failed.";
    // Distinguish "not found" vs "not allowed" vs server error
    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message.includes("cannot be retried")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
