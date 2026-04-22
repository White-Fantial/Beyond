import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { removePlatformIngredientLink } from "@/services/admin/admin-suppliers.service";

interface RouteContext {
  params: Promise<{ id: string; linkId: string }>;
}

async function requireModOrAdmin() {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) return null;
  if (!ctx.isPlatformAdmin && !ctx.isPlatformModerator) return null;
  return ctx;
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const ctx = await requireModOrAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { linkId } = await params;
  try {
    await removePlatformIngredientLink(linkId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to remove link";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
