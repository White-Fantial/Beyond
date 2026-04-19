import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import {
  setDefaultPaymentMethod,
  SavedPaymentMethodNotFoundError,
} from "@/services/customer.service";

/**
 * PATCH /api/customer/payment-methods/[methodId]/set-default
 */
export async function PATCH(
  _req: NextRequest,
  { params }: { params: { methodId: string } }
) {
  const { methodId } = params;
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const method = await setDefaultPaymentMethod(ctx.userId, methodId);
    return NextResponse.json({ data: method });
  } catch (err) {
    if (err instanceof SavedPaymentMethodNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error("[customer/payment-methods/set-default PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
