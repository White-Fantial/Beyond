import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import {
  getPlatformSupplierDetail,
  updatePlatformSupplier,
  deletePlatformSupplier,
} from "@/services/admin/admin-suppliers.service";
import type { UpdateSupplierInput } from "@/types/owner-suppliers";

interface RouteContext {
  params: Promise<{ supplierId: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.isPlatformAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { supplierId } = await params;
  try {
    const supplier = await getPlatformSupplierDetail(supplierId);
    return NextResponse.json({ data: supplier });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.isPlatformAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { supplierId } = await params;
  const body = (await req.json()) as UpdateSupplierInput;

  try {
    const supplier = await updatePlatformSupplier(supplierId, body);
    return NextResponse.json({ data: supplier });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.isPlatformAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { supplierId } = await params;
  try {
    await deletePlatformSupplier(supplierId);
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
