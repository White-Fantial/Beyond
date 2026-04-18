import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import {
  listMarketplaceRecipes,
  createMarketplaceRecipe,
} from "@/services/marketplace/recipe-marketplace.service";
import type {
  CreateMarketplaceRecipeInput,
  MarketplaceRecipeFilters,
} from "@/types/marketplace";

export async function GET(req: NextRequest) {
  await requireAuth();
  const { searchParams } = new URL(req.url);

  const filters: MarketplaceRecipeFilters = {
    type:
      (searchParams.get("type") as MarketplaceRecipeFilters["type"]) ??
      undefined,
    status:
      (searchParams.get(
        "status"
      ) as MarketplaceRecipeFilters["status"]) ?? undefined,
    cuisineTag: searchParams.get("cuisineTag") ?? undefined,
    difficulty:
      (searchParams.get(
        "difficulty"
      ) as MarketplaceRecipeFilters["difficulty"]) ?? undefined,
    providerId: searchParams.get("providerId") ?? undefined,
    page: Number(searchParams.get("page") ?? "1"),
    pageSize: Number(searchParams.get("pageSize") ?? "20"),
  };

  const result = await listMarketplaceRecipes(filters);
  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest) {
  const ctx = await requireAuth();

  const isAdmin = ctx.isPlatformAdmin;
  const isModerator = ctx.isPlatformModerator;
  const isProvider = ctx.isRecipeProvider;

  if (!isAdmin && !isModerator && !isProvider) {
    return NextResponse.json(
      { error: "Insufficient permissions to create marketplace recipes" },
      { status: 403 }
    );
  }

  const body = (await req.json()) as CreateMarketplaceRecipeInput;

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!body.type) {
    return NextResponse.json({ error: "type is required" }, { status: 400 });
  }
  if (body.type === "PREMIUM" && !isProvider && !isAdmin) {
    return NextResponse.json(
      { error: "Only RECIPE_PROVIDER may create PREMIUM recipes" },
      { status: 403 }
    );
  }
  if (body.type === "BASIC" && isProvider && !isAdmin && !isModerator) {
    return NextResponse.json(
      { error: "RECIPE_PROVIDER cannot create BASIC recipes" },
      { status: 403 }
    );
  }

  const providerId =
    body.type === "PREMIUM" && isProvider ? ctx.userId : null;

  const recipe = await createMarketplaceRecipe(ctx.userId, providerId, body);
  return NextResponse.json({ data: recipe }, { status: 201 });
}
