import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import {
  listPlatformSuppliers,
  createPlatformSupplier,
} from "@/services/admin/admin-suppliers.service";
import type { CreatePlatformSupplierInput } from "@/types/owner-suppliers";

export async function GET(req: NextRequest) {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.isPlatformAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "50");

  const result = await listPlatformSuppliers(page, pageSize);
  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest) {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.isPlatformAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json()) as CreatePlatformSupplierInput;
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  try {
    const supplier = await createPlatformSupplier(body);
    return NextResponse.json({ data: supplier }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create supplier";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
