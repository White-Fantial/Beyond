import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import {
  getMarketplaceRecipe,
  updateMarketplaceRecipe,
  deleteMarketplaceRecipe,
} from "@/services/marketplace/recipe-marketplace.service";
import type { UpdateMarketplaceRecipeInput } from "@/types/marketplace";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  await requireAuth();
  const { id } = await params;
  const recipe = await getMarketplaceRecipe(id);
  return NextResponse.json({ data: recipe });
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const ctx = await requireAuth();
  const { id } = await params;

  const recipe = await getMarketplaceRecipe(id);

  const isAdmin = ctx.isPlatformAdmin;
  const isModerator = ctx.isPlatformModerator;
  const isProvider = ctx.isRecipeProvider && recipe.providerId === ctx.userId;

  if (!isAdmin && !isModerator && !isProvider) {
    return NextResponse.json(
      { error: "Insufficient permissions to edit this recipe" },
      { status: 403 }
    );
  }

  // Provider can only edit when status allows it
  if (isProvider && !isAdmin && !isModerator) {
    const editableStatuses = ["DRAFT", "CHANGE_REQUESTED"];
    if (!editableStatuses.includes(recipe.status)) {
      return NextResponse.json(
        { error: `Recipe cannot be edited in status '${recipe.status}'` },
        { status: 422 }
      );
    }
  }

  const body = (await req.json()) as UpdateMarketplaceRecipeInput;
  const updated = await updateMarketplaceRecipe(id, body);
  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const ctx = await requireAuth();
  const { id } = await params;

  if (!ctx.isPlatformAdmin && !ctx.isPlatformModerator) {
    return NextResponse.json(
      { error: "Only admins and moderators can delete marketplace recipes" },
      { status: 403 }
    );
  }

  await deleteMarketplaceRecipe(id);
  return NextResponse.json({ success: true });
}
