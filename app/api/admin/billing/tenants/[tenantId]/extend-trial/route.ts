import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminNotImpersonating } from "@/lib/admin/auth-guard";
import { extendTenantTrial } from "@/services/admin/admin-subscription.service";

interface Params {
  params: { tenantId: string };
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePlatformAdminNotImpersonating();
    const { tenantId } = params;
    const body = await req.json();
    const { subscriptionId, extensionDays, note } = body;
    if (!subscriptionId || !extensionDays) {
      return NextResponse.json({ error: "subscriptionId and extensionDays are required" }, { status: 400 });
    }
    await extendTenantTrial({ tenantId, subscriptionId, extensionDays: Number(extensionDays), note, actorUserId: ctx.userId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.startsWith("impersonation_active")) {
      return NextResponse.json({ error: "먼저 impersonation을 종료해주세요." }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
