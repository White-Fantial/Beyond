import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { applyOwnerInvoiceImport } from "@/services/owner/owner-invoice-imports.service";

interface Params {
  params: Promise<{ batchId: string }>;
}

export async function POST(_req: Request, { params }: Params) {
  const { batchId } = await params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  try {
    const result = await applyOwnerInvoiceImport(tenantId, batchId);
    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to apply invoice import.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
