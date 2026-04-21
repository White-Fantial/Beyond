import { NextRequest, NextResponse } from "next/server";
import { requireOwnerStoreAccess, resolveActorTenantId } from "@/services/owner/owner-authz.service";
import {
  listStoreProductSelections,
  selectProductForStore,
} from "@/services/owner/owner-tenant-products.service";

interface Params {
  params: Promise<{ storeId: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { storeId } = await params;
  try {
    await requireOwnerStoreAccess(storeId);
    const selections = await listStoreProductSelections(storeId);
    return NextResponse.json({ data: selections });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { storeId } = await params;
  try {
    const ctx = await requireOwnerStoreAccess(storeId);
    const tenantId = resolveActorTenantId(ctx, storeId);
    const body = await req.json();
    const { tenantProductId, customPriceAmount, displayOrder } = body as {
      tenantProductId: string;
      customPriceAmount?: number | null;
      displayOrder?: number;
    };

    if (!tenantProductId) {
      return NextResponse.json({ error: "tenantProductId is required" }, { status: 400 });
    }

    const selection = await selectProductForStore({
      tenantId,
      storeId,
      tenantProductId,
      actorUserId: ctx.userId,
      customPriceAmount,
      displayOrder,
    });

    return NextResponse.json({ data: selection }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
