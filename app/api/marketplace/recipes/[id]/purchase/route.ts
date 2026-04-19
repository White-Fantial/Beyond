import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { purchaseRecipe } from "@/services/marketplace/recipe-purchase.service";
import type { PurchaseRecipeInput } from "@/types/marketplace";

interface RouteContext {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const ctx = await requireAuth();
  const { id } = params;

  const body = (await req.json().catch(() => ({}))) as PurchaseRecipeInput;
  const purchase = await purchaseRecipe(id, ctx.userId, body);
  return NextResponse.json({ data: purchase }, { status: 201 });
}
