import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import {
  listSuppliers,
  createSupplier,
} from "@/services/owner/owner-suppliers.service";
import type { CreateSupplierInput } from "@/types/owner-suppliers";

export async function GET(req: NextRequest) {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");

  const result = await listSuppliers(tenantId, { storeId, page, pageSize });
  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest) {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const body = (await req.json()) as CreateSupplierInput;

  if (!body.storeId) {
    return NextResponse.json({ error: "storeId is required" }, { status: 400 });
  }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const supplier = await createSupplier(tenantId, body);
  return NextResponse.json({ data: supplier }, { status: 201 });
}
