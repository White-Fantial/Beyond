import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdminNotImpersonating } from "@/lib/admin/auth-guard";
import { createTenantMembership } from "@/services/admin/admin-membership.service";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePlatformAdminNotImpersonating();
    const body = await req.json();
    const { tenantId, userId, role, status } = body;
    const result = await createTenantMembership(
      { tenantId, userId, role, status },
      ctx.userId
    );
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.startsWith("impersonation_active")) {
      return NextResponse.json({ error: "먼저 impersonation을 종료해주세요." }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
