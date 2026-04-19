import { NextRequest, NextResponse } from "next/server";
import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import {
  createBackofficeModifierOption,
  getStoreTenantId,
} from "@/services/backoffice/backoffice-catalog.service";
import type { CreateModifierOptionInput } from "@/services/backoffice/backoffice-catalog.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string; groupId: string }> }
) {
  try {
    const { storeId, groupId } = await params;
    const ctx = await requireStorePermission(storeId, PERMISSIONS.MODIFIER_MANAGE);

    const body = (await req.json()) as CreateModifierOptionInput;

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const tenantId = await getStoreTenantId(storeId);
    const option = await createBackofficeModifierOption(
      storeId,
      tenantId,
      ctx.userId,
      groupId,
      body
    );

    return NextResponse.json({ data: option }, { status: 201 });
  } catch (err) {
    console.error("[backoffice/modifiers/options POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
