import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { reviewSupplierRequest } from "@/services/marketplace/supplier-requests.service";
import type { ReviewSupplierRequestInput } from "@/types/owner-suppliers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ctx.isPlatformAdmin && !ctx.isPlatformModerator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json()) as ReviewSupplierRequestInput;

  if (!body.status || !["APPROVED", "REJECTED", "DUPLICATE"].includes(body.status)) {
    return NextResponse.json(
      { error: "status must be one of APPROVED, REJECTED, DUPLICATE" },
      { status: 400 }
    );
  }

  if (body.status === "DUPLICATE" && !body.resolvedSupplierId) {
    return NextResponse.json(
      { error: "resolvedSupplierId is required when marking as duplicate" },
      { status: 400 }
    );
  }

  try {
    const result = await reviewSupplierRequest(id, ctx.userId, body);
    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Review failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
