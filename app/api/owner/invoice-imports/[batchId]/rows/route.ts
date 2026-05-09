import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { addOwnerInvoiceImportManualRow } from "@/services/owner/owner-invoice-imports.service";

interface Params {
  params: Promise<{ batchId: string }>;
}

export async function POST(_req: Request, { params }: Params) {
  const { batchId } = await params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  try {
    const row = await addOwnerInvoiceImportManualRow(tenantId, batchId);
    return NextResponse.json({ data: row }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add manual row.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
