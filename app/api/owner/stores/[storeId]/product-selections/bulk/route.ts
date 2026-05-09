import { NextRequest, NextResponse } from "next/server";
import { requireOwnerStoreAccess, resolveActorTenantId } from "@/services/owner/owner-authz.service";
import { selectProductsForStoreBulk } from "@/services/owner/owner-tenant-products.service";

interface Params {
  params: Promise<{ storeId: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  const { storeId } = await params;

  try {
    const ctx = await requireOwnerStoreAccess(storeId);
    const tenantId = resolveActorTenantId(ctx, storeId);
    const body = (await req.json().catch(() => ({}))) as { tenantProductIds?: string[] };

    const tenantProductIds = Array.isArray(body.tenantProductIds) ? body.tenantProductIds : [];
    if (tenantProductIds.length === 0) {
      return NextResponse.json({ error: "tenantProductIds is required" }, { status: 400 });
    }

    const result = await selectProductsForStoreBulk({
      tenantId,
      storeId,
      tenantProductIds,
      actorUserId: ctx.userId,
    });

    return NextResponse.json({ data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
