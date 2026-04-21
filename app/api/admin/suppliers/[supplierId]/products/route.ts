import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { createPlatformSupplierProduct } from "@/services/admin/admin-suppliers.service";
import type { UpsertSupplierProductInput } from "@/types/owner-suppliers";

interface RouteContext {
  params: Promise<{ supplierId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.isPlatformAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { supplierId } = await params;
  const body = (await req.json()) as UpsertSupplierProductInput;

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!body.unit) {
    return NextResponse.json({ error: "unit is required" }, { status: 400 });
  }

  try {
    const product = await createPlatformSupplierProduct(supplierId, body);
    return NextResponse.json({ data: product }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create product";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
