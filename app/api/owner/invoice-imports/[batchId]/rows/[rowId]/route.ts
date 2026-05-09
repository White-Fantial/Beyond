import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { updateOwnerInvoiceImportRow } from "@/services/owner/owner-invoice-imports.service";
import type { UpdateOwnerInvoiceImportRowInput } from "@/types/owner-invoice-imports";

interface Params {
  params: Promise<{ batchId: string; rowId: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { batchId, rowId } = await params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const body = (await req.json()) as UpdateOwnerInvoiceImportRowInput;

  try {
    const row = await updateOwnerInvoiceImportRow(tenantId, batchId, rowId, body);
    return NextResponse.json({ data: row });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update invoice import row.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
