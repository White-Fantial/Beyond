import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { copyMarketplaceRecipeToOwner, copyPlatformRecipeToOwner } from "@/services/owner/owner-recipes.service";
import type { CopyMarketplaceRecipeInput } from "@/types/owner-recipes";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/marketplace/recipes/[id]/copy
 *
 * Copies a marketplace recipe (or a platform-level Recipe when id is "platform:{id}")
 * into the authenticated user's owner recipe list.
 * BASIC recipes may be copied by any authenticated tenant user.
 * PREMIUM recipes require a valid purchase record.
 *
 * Body: { storeId: string; name?: string }
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const ctx = await requireAuth();
  const { id } = await params;

  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  if (!tenantId) {
    return NextResponse.json(
      { error: "No tenant membership found" },
      { status: 403 }
    );
  }

  const body = (await req.json()) as CopyMarketplaceRecipeInput;

  if (!body.storeId?.trim()) {
    return NextResponse.json({ error: "storeId is required" }, { status: 400 });
  }

  try {
    // Handle platform recipe (admin-created Recipe with tenantId=null)
    if (id.startsWith("platform:")) {
      const platformRecipeId = id.slice("platform:".length);
      const recipe = await copyPlatformRecipeToOwner(tenantId, platformRecipeId, body);
      return NextResponse.json({ data: recipe }, { status: 201 });
    }

    const recipe = await copyMarketplaceRecipeToOwner(
      tenantId,
      ctx.userId,
      id,
      body
    );
    return NextResponse.json({ data: recipe }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Copy failed";
    const status = message.includes("not purchased") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
