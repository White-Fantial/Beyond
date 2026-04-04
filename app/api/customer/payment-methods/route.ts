import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { listSavedPaymentMethods, addSavedPaymentMethod } from "@/services/customer.service";

/**
 * GET /api/customer/payment-methods
 * Returns all saved payment methods for the authenticated user.
 */
export async function GET() {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const methods = await listSavedPaymentMethods(ctx.userId);
  return NextResponse.json({ data: methods });
}

/**
 * POST /api/customer/payment-methods
 * Body: { providerMethodId, last4, brand, expiryMonth, expiryYear }
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const method = await addSavedPaymentMethod(ctx.userId, body);
    return NextResponse.json({ data: method }, { status: 201 });
  } catch (err) {
    console.error("[customer/payment-methods POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
