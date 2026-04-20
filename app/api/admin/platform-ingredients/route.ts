import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import {
  listPlatformIngredients,
  createPlatformIngredient,
} from "@/services/marketplace/platform-ingredients.service";
import type { CreateIngredientInput, IngredientFilters } from "@/types/owner-ingredients";

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

  const body = (await req.json()) as Pick<CreateIngredientInput, "name" | "description" | "category" | "purchaseUnit" | "unit" | "unitCost" | "currency">;

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!body.purchaseUnit) {
    return NextResponse.json({ error: "purchaseUnit is required" }, { status: 400 });
  }
  if (!body.unit) {
    return NextResponse.json({ error: "unit is required" }, { status: 400 });
  }
  if (body.unitCost === undefined || body.unitCost < 0) {
    return NextResponse.json(
      { error: "unitCost must be a non-negative integer" },
      { status: 400 }
    );
  }

  const ingredient = await createPlatformIngredient(ctx.userId, body);
  return NextResponse.json({ data: ingredient }, { status: 201 });
}
