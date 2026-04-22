import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import {
  getPlatformSupplierProduct,
  updatePlatformSupplierProduct,
  deletePlatformSupplierProduct,
} from "@/services/admin/admin-suppliers.service";
import type { UpdateSupplierProductInput } from "@/types/owner-suppliers";

interface RouteContext {
  params: Promise<{ supplierId: string; productId: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.isPlatformAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { supplierId, productId } = await params;
  try {
    const product = await getPlatformSupplierProduct(supplierId, productId);
    return NextResponse.json({ data: product });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.isPlatformAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { supplierId, productId } = await params;
  const body = (await req.json()) as UpdateSupplierProductInput;

  try {
    const product = await updatePlatformSupplierProduct(supplierId, productId, body);
    return NextResponse.json({ data: product });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.isPlatformAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { supplierId, productId } = await params;
  try {
    await deletePlatformSupplierProduct(supplierId, productId);
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
