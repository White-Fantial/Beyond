import { NextResponse } from "next/server";
import { requireOwnerAdminAccess } from "@/lib/owner/auth-guard";
import { getBillingInvoiceDetail } from "@/services/owner/owner-billing.service";

export async function GET(
  _request: Request,
  { params }: { params: { invoiceId: string } }
) {
  const ctx = await requireOwnerAdminAccess();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });
  const detail = await getBillingInvoiceDetail(tenantId, params.invoiceId);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(detail);
}
