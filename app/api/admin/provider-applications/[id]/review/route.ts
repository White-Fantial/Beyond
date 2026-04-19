import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminNotImpersonating } from "@/lib/admin/auth-guard";
import { reviewApplication } from "@/services/provider/provider-onboarding.service";
import type { ReviewProviderApplicationInput } from "@/types/provider-onboarding";

interface RouteContext {
  params: { id: string };
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const ctx = await requirePlatformAdminNotImpersonating();
  const { id } = params;

  const body = (await req.json().catch(() => ({}))) as ReviewProviderApplicationInput;
  if (!body.status || !["APPROVED", "REJECTED"].includes(body.status)) {
    return NextResponse.json(
      { error: "status must be APPROVED or REJECTED" },
      { status: 400 }
    );
  }

  try {
    const application = await reviewApplication(id, ctx.userId, body);
    return NextResponse.json({ data: application });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to review application";
    const status = message.includes("not found") ? 404 : 409;
    return NextResponse.json({ error: message }, { status });
  }
}
