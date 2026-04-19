import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminNotImpersonating } from "@/lib/admin/auth-guard";
import { addTenantBillingRecord } from "@/services/admin/admin-subscription.service";

interface Params {
  params: Promise<{ tenantId: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requirePlatformAdminNotImpersonating();
    const { tenantId } = await params;
    const body = await req.json();
    const { recordType, summary } = body;
    if (!recordType || !summary) {
      return NextResponse.json({ error: "recordType and summary are required" }, { status: 400 });
    }
    const result = await addTenantBillingRecord({ tenantId, ...body, actorUserId: ctx.userId });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.startsWith("impersonation_active")) {
      return NextResponse.json({ error: "먼저 impersonation을 종료해주세요." }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
