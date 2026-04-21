import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import {
  getPlatformIngredient,
  updatePlatformIngredient,
  deletePlatformIngredient,
} from "@/services/marketplace/platform-ingredients.service";
import type { IngredientUnit, UpdateIngredientInput } from "@/types/owner-ingredients";
import { getUnitConversionFactor } from "@/types/owner-ingredients";

interface UpdatePlatformIngredientBody {
  name?: string;
  description?: string | null;
  category?: string | null;
  purchaseUnit?: IngredientUnit;
  purchaseQty?: number;
  unit?: IngredientUnit;
  /** Purchase price in dollars (USD). unitCost is derived server-side. */
  purchasePrice?: number;
  currency?: string;
  isActive?: boolean;
  notes?: string;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function requireModOrAdmin() {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) return null;
  if (!ctx.isPlatformAdmin && !ctx.isPlatformModerator) return null;
  return ctx;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
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

  const { id } = await params;
  const ingredient = await getPlatformIngredient(id);
  return NextResponse.json({ data: ingredient });
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const ctx = await requireModOrAdmin();
  if (!ctx) {
    return NextResponse.json(
      { error: "Admin or moderator access required" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const body = (await req.json()) as UpdatePlatformIngredientBody;

  // When purchasePrice is provided, derive unitCost on the server.
  const update: UpdateIngredientInput = {
    name: body.name,
    description: body.description ?? undefined,
    category: body.category ?? undefined,
    purchaseUnit: body.purchaseUnit,
    purchaseQty: body.purchaseQty,
    unit: body.unit,
    currency: body.currency,
    isActive: body.isActive,
    notes: body.notes,
  };

  if (body.purchasePrice !== undefined) {
    if (!isFinite(body.purchasePrice) || body.purchasePrice <= 0) {
      return NextResponse.json({ error: "purchasePrice must be a positive number (dollars)" }, { status: 400 });
    }
    const purchaseQty = body.purchaseQty;
    const purchaseUnit = body.purchaseUnit;
    const unit = body.unit;

    // We need all three fields to recalculate; resolve current values if not provided.
    const existing = await getPlatformIngredient(id);
    const resolvedQty = purchaseQty ?? existing.purchaseQty;
    const resolvedPurchaseUnit = purchaseUnit ?? existing.purchaseUnit;
    const resolvedUnit = unit ?? existing.unit;

    if (resolvedQty <= 0) {
      return NextResponse.json({ error: "purchaseQty must be a positive number" }, { status: 400 });
    }
    const conversionFactor = getUnitConversionFactor(resolvedPurchaseUnit, resolvedUnit);
    if (conversionFactor === undefined) {
      return NextResponse.json(
        { error: `Cannot convert purchaseUnit (${resolvedPurchaseUnit}) to recipe unit (${resolvedUnit})` },
        { status: 400 }
      );
    }
    update.unitCost = Math.round((body.purchasePrice / (resolvedQty * conversionFactor)) * 100000);
  }

  const ingredient = await updatePlatformIngredient(id, update);
  return NextResponse.json({ data: ingredient });
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const ctx = await requireModOrAdmin();
  if (!ctx) {
    return NextResponse.json(
      { error: "Admin or moderator access required" },
      { status: 403 }
    );
  }

  const { id } = await params;
  await deletePlatformIngredient(id);
  return NextResponse.json({ success: true });
}
