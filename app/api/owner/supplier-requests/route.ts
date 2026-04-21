import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import {
  createSupplierRequest,
  getTenantSupplierRequests,
} from "@/services/marketplace/supplier-requests.service";
import type { CreateSupplierRequestInput } from "@/types/owner-suppliers";

export async function GET(req: NextRequest) {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "50");

  const result = await getTenantSupplierRequests(tenantId, page, pageSize);
  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest) {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  const body = (await req.json()) as CreateSupplierRequestInput;
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  try {
    const request = await createSupplierRequest(ctx.userId, tenantId, body);
    return NextResponse.json({ data: request }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
