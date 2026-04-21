import { NextRequest, NextResponse } from "next/server";
import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import {
  listTenantProducts,
  createTenantProduct,
} from "@/services/owner/owner-tenant-products.service";

export async function GET() {
  try {
    const ctx = await requireOwnerPortalAccess();
    const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
    const products = await listTenantProducts(tenantId);
    return NextResponse.json({ data: products });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOwnerPortalAccess();
    const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
    const body = await req.json();

    const product = await createTenantProduct({
      tenantId,
      actorUserId: ctx.userId,
      data: body,
    });

    return NextResponse.json({ data: product }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
