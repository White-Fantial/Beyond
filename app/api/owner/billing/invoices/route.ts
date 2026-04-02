import { NextResponse } from "next/server";
import { requireOwnerAdminAccess } from "@/lib/owner/auth-guard";
import { listBillingInvoices } from "@/services/owner/owner-billing.service";

export async function GET(request: Request) {
  const ctx = await requireOwnerAdminAccess();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const result = await listBillingInvoices(tenantId, {
    status: searchParams.get("status") ?? undefined,
    page: parseInt(searchParams.get("page") ?? "1", 10),
    pageSize: parseInt(searchParams.get("pageSize") ?? "20", 10),
  });
  return NextResponse.json(result);
}
