import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import {
  listTenantIngredients,
  registerTenantIngredient,
} from "@/services/owner/owner-tenant-ingredients.service";

/**
 * GET /api/owner/tenant-ingredients
 * List all PLATFORM ingredients registered for the current tenant.
 */
export async function GET() {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant membership found" }, { status: 403 });
  }

  try {
    const items = await listTenantIngredients(tenantId);
    return NextResponse.json({ data: items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * POST /api/owner/tenant-ingredients
 * Register a PLATFORM ingredient for use in this tenant.
 * Body: { ingredientId: string }
 */
export async function POST(req: NextRequest) {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant membership found" }, { status: 403 });
  }

  const body = (await req.json()) as { ingredientId?: string };
  if (!body.ingredientId?.trim()) {
    return NextResponse.json({ error: "ingredientId is required" }, { status: 400 });
  }

  try {
    const registration = await registerTenantIngredient(tenantId, body.ingredientId);
    return NextResponse.json({ data: registration }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
