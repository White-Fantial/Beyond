import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import {
  pauseCustomerSubscription,
  CustomerSubscriptionNotFoundError,
  CustomerSubscriptionOwnershipError,
  CustomerSubscriptionTransitionError,
} from "@/services/customer.service";

interface Params {
  params: Promise<{ subscriptionId: string }>;
}

/**
 * PATCH /api/customer/subscriptions/[subscriptionId]/pause
 */
export async function PATCH(_req: NextRequest, { params }: Params) {
  const { subscriptionId } = await params;
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    await pauseCustomerSubscription(subscriptionId, ctx.email);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof CustomerSubscriptionNotFoundError) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }
    if (err instanceof CustomerSubscriptionOwnershipError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (err instanceof CustomerSubscriptionTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("[customer/subscriptions/pause] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
