import { NextRequest, NextResponse } from "next/server";
import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import {
  updateTenantProductCategory,
  deleteTenantProductCategory,
} from "@/services/owner/owner-tenant-products.service";

interface Params {
  params: Promise<{ categoryId: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { categoryId } = await params;
  try {
    const ctx = await requireOwnerPortalAccess();
    const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
    const body = await req.json();

    const category = await updateTenantProductCategory(tenantId, categoryId, ctx.userId, {
      name: body.name,
      displayOrder: body.displayOrder,
    });
    return NextResponse.json({ data: category });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { categoryId } = await params;
  try {
    const ctx = await requireOwnerPortalAccess();
    const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
    await deleteTenantProductCategory(tenantId, categoryId, ctx.userId);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
