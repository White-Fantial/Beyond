import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import {
  getPlatformIngredient,
  updatePlatformIngredient,
  deletePlatformIngredient,
} from "@/services/marketplace/platform-ingredients.service";
import type { UpdateIngredientInput } from "@/types/owner-ingredients";

interface RouteContext {
  params: { id: string };
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

  const { id } = params;
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

  const { id } = params;
  const body = (await req.json()) as UpdateIngredientInput;
  const ingredient = await updatePlatformIngredient(id, body);
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

  const { id } = params;
  await deletePlatformIngredient(id);
  return NextResponse.json({ success: true });
}
