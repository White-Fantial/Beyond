import { NextResponse } from "next/server";
import { requireOwnerAdminAccess } from "@/lib/owner/auth-guard";
import { getBillingOverview } from "@/services/owner/owner-billing.service";

export async function GET() {
  const ctx = await requireOwnerAdminAccess();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });
  const overview = await getBillingOverview(tenantId);
  return NextResponse.json(overview);
}
