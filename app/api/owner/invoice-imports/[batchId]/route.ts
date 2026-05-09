import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { getOwnerInvoiceImportDetail } from "@/services/owner/owner-invoice-imports.service";

interface Params {
  params: Promise<{ batchId: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  const { batchId } = await params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  try {
    const detail = await getOwnerInvoiceImportDetail(tenantId, batchId);
    return NextResponse.json({ data: detail });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invoice import batch not found.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
