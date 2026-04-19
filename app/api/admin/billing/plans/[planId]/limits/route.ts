import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminNotImpersonating } from "@/lib/admin/auth-guard";
import { replaceAdminPlanLimits } from "@/services/admin/admin-plan.service";

interface Params {
  params: Promise<{ planId: string }>;
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePlatformAdminNotImpersonating();
    const { planId } = await params;
    const body = await req.json();
    const { limits } = body;
    if (!Array.isArray(limits)) {
      return NextResponse.json({ error: "limits must be an array" }, { status: 400 });
    }
    await replaceAdminPlanLimits(planId, limits, ctx.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.startsWith("impersonation_active")) {
      return NextResponse.json({ error: "먼저 impersonation을 종료해주세요." }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
