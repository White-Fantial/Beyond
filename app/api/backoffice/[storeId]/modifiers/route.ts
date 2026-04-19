import { NextRequest, NextResponse } from "next/server";
import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import {
  createBackofficeModifierGroup,
  getStoreTenantId,
} from "@/services/backoffice/backoffice-catalog.service";
import type { CreateModifierGroupInput } from "@/services/backoffice/backoffice-catalog.service";

export async function POST(
  req: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    const { storeId } = params;
    const ctx = await requireStorePermission(storeId, PERMISSIONS.MODIFIER_MANAGE);

    const body = (await req.json()) as CreateModifierGroupInput;

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const tenantId = await getStoreTenantId(storeId);
    const group = await createBackofficeModifierGroup(storeId, tenantId, ctx.userId, body);

    return NextResponse.json({ data: group }, { status: 201 });
  } catch (err) {
    console.error("[backoffice/modifiers POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
