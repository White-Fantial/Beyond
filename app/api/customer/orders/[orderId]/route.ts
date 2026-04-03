import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import {
  getCustomerOrderDetail,
  CustomerOrderNotFoundError,
} from "@/services/customer.service";

interface Params {
  params: { orderId: string };
}

/**
 * GET /api/customer/orders/[orderId]
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const order = await getCustomerOrderDetail(params.orderId, ctx.email);
    return NextResponse.json(order);
  } catch (err) {
    if (err instanceof CustomerOrderNotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[customer/orders/detail] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
