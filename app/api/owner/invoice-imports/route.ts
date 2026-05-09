import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { createOwnerInvoiceImport } from "@/services/owner/owner-invoice-imports.service";

export async function POST(req: NextRequest) {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const userId = ctx.userId;
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant membership found." }, { status: 403 });
  }

  const formData = await req.formData();
  const supplierId = String(formData.get("supplierId") ?? "").trim();
  const file = formData.get("invoiceFile");

  if (!supplierId) {
    return NextResponse.json({ error: "supplierId is required." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "invoiceFile is required." }, { status: 400 });
  }

  try {
    const detail = await createOwnerInvoiceImport(tenantId, userId, {
      supplierId,
      fileName: file.name || "invoice-upload",
      fileMimeType: file.type || null,
      fileSize: file.size,
      fileBuffer: Buffer.from(await file.arrayBuffer()),
    });
    return NextResponse.json({ data: detail }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create invoice import.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
