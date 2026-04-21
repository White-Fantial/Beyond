import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { importPlatformIngredient } from "@/services/owner/owner-ingredients.service";

interface ImportBody {
  platformIngredientId: string;
  storeId: string;
}

/**
 * POST /api/owner/platform-ingredients/import
 *
 * Creates a STORE-scope copy of a PLATFORM ingredient.
 * Pricing is set separately via SupplierContractPrice or SupplierPriceRecord.
 */
export async function POST(req: NextRequest) {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant membership found" }, { status: 403 });
  }

  const body = (await req.json()) as ImportBody;

  if (!body.platformIngredientId?.trim()) {
    return NextResponse.json({ error: "platformIngredientId is required" }, { status: 400 });
  }
  if (!body.storeId?.trim()) {
    return NextResponse.json({ error: "storeId is required" }, { status: 400 });
  }

  try {
    const ingredient = await importPlatformIngredient(
      tenantId,
      body.storeId,
      body.platformIngredientId
    );
    return NextResponse.json({ data: ingredient }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
