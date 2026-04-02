import { NextResponse } from "next/server";
import { requireOwnerAdminAccess } from "@/lib/owner/auth-guard";
import { requestPlanChange } from "@/services/owner/owner-billing.service";

export async function POST(request: Request) {
  const ctx = await requireOwnerAdminAccess();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });
  const body = await request.json();
  const targetPlanCode = body?.targetPlanCode as string;
  if (!targetPlanCode) return NextResponse.json({ error: "targetPlanCode required" }, { status: 400 });
  const userId = ctx.userId;
  const result = await requestPlanChange(tenantId, targetPlanCode, userId);
  if (!result.success && result.blocked) {
    return NextResponse.json(result, { status: 422 });
  }
  return NextResponse.json(result);
}
