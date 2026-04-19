import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import {
  removeSavedPaymentMethod,
  SavedPaymentMethodNotFoundError,
} from "@/services/customer.service";

/**
 * DELETE /api/customer/payment-methods/[methodId]
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ methodId: string }> }
) {
  const { methodId } = await params;
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    await removeSavedPaymentMethod(ctx.userId, methodId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof SavedPaymentMethodNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error("[customer/payment-methods DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
