import { NextResponse } from "next/server";
import { requireOwnerAdminAccess } from "@/lib/owner/auth-guard";
import { getPlanCatalog } from "@/services/owner/owner-billing.service";

export async function GET() {
  const ctx = await requireOwnerAdminAccess();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });
  const catalog = await getPlanCatalog(tenantId);
  return NextResponse.json(catalog);
}
