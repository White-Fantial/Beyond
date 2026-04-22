import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { deregisterTenantIngredient } from "@/services/owner/owner-tenant-ingredients.service";

interface Params {
  params: Promise<{ ingredientId: string }>;
}

/**
 * DELETE /api/owner/tenant-ingredients/[ingredientId]
 * De-register a PLATFORM ingredient from the current tenant.
 */
export async function DELETE(_req: Request, { params }: Params) {
  const { ingredientId } = await params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant membership found" }, { status: 403 });
  }

  try {
    await deregisterTenantIngredient(tenantId, ingredientId);
    return NextResponse.json({ data: { deregistered: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Deregistration failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
