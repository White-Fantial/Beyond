import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import {
  listPlatformIngredients,
  createPlatformIngredient,
} from "@/services/marketplace/platform-ingredients.service";
import type { IngredientFilters, IngredientUnit } from "@/types/owner-ingredients";
import { getUnitConversionFactor } from "@/types/owner-ingredients";

interface CreatePlatformIngredientBody {
  name: string;
  description?: string;
  category?: string;
  purchaseUnit: IngredientUnit;
  purchaseQty: number;
  unit: IngredientUnit;
  /** Purchase price in dollars (USD). unitCost is derived server-side. */
  purchasePrice: number;
  currency?: string;
}

export async function GET(req: NextRequest) {
  // Admins, moderators, and providers can list ingredients
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (
    !ctx.isPlatformAdmin &&
    !ctx.isPlatformModerator &&
    !ctx.isRecipeProvider
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const filters: Pick<IngredientFilters, "category" | "isActive" | "page" | "pageSize"> = {
    category: searchParams.get("category") ?? undefined,
    isActive:
      searchParams.has("isActive")
        ? searchParams.get("isActive") === "true"
        : undefined,
    page: Number(searchParams.get("page") ?? "1"),
    pageSize: Number(searchParams.get("pageSize") ?? "50"),
  };

  const result = await listPlatformIngredients(filters);
  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest) {
  const ctx = await requirePlatformAdmin();

  // Allow both admins and moderators to create
  const currentCtx = await getCurrentUserAuthContext();
  if (currentCtx && !currentCtx.isPlatformAdmin && !currentCtx.isPlatformModerator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as CreatePlatformIngredientBody;

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!body.purchaseUnit) {
    return NextResponse.json({ error: "purchaseUnit is required" }, { status: 400 });
  }
  if (!body.unit) {
    return NextResponse.json({ error: "unit is required" }, { status: 400 });
  }
  if (!isFinite(body.purchasePrice) || body.purchasePrice <= 0) {
    return NextResponse.json({ error: "purchasePrice must be a positive number (dollars)" }, { status: 400 });
  }
  if (!isFinite(body.purchaseQty) || body.purchaseQty <= 0) {
    return NextResponse.json({ error: "purchaseQty must be a positive number" }, { status: 400 });
  }
  const conversionFactor = getUnitConversionFactor(body.purchaseUnit, body.unit);
  if (conversionFactor === undefined) {
    return NextResponse.json(
      { error: `Cannot convert purchaseUnit (${body.purchaseUnit}) to recipe unit (${body.unit})` },
      { status: 400 }
    );
  }
  const unitCost = Math.round((body.purchasePrice / (body.purchaseQty * conversionFactor)) * 100000);

  const ingredient = await createPlatformIngredient(ctx.userId, {
    name: body.name,
    description: body.description,
    category: body.category,
    purchaseUnit: body.purchaseUnit,
    purchaseQty: body.purchaseQty,
    unit: body.unit,
    unitCost,
    currency: body.currency,
  });
  return NextResponse.json({ data: ingredient }, { status: 201 });
}
