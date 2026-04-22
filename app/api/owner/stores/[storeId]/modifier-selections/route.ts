import { NextRequest, NextResponse } from "next/server";
import { requireOwnerStoreAccess, resolveActorTenantId } from "@/services/owner/owner-authz.service";
import { listStoreModifierGroupSelections } from "@/services/owner/owner-tenant-modifiers.service";

interface Params {
  params: Promise<{ storeId: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { storeId } = await params;
  try {
    const ctx = await requireOwnerStoreAccess(storeId);
    const tenantId = resolveActorTenantId(ctx, storeId);
    const selections = await listStoreModifierGroupSelections(storeId, tenantId);
    return NextResponse.json({ data: selections });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
