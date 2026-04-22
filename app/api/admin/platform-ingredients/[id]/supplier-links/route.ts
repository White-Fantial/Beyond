import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import {
  getPlatformIngredientLinks,
  addPlatformIngredientLink,
} from "@/services/admin/admin-suppliers.service";

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
  const ctx = await requireModOrAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  try {
    const links = await getPlatformIngredientLinks(id);
    return NextResponse.json({ data: links });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch links";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const ctx = await requireModOrAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = (await req.json()) as { supplierProductId: string };

  if (!body.supplierProductId) {
    return NextResponse.json({ error: "supplierProductId is required" }, { status: 400 });
  }

  try {
    const link = await addPlatformIngredientLink(id, body.supplierProductId);
    return NextResponse.json({ data: link }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add link";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
