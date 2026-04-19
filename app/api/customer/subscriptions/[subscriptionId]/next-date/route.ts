import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import {
  updateNextOrderDate,
  CustomerSubscriptionNotFoundError,
  CustomerSubscriptionOwnershipError,
  CustomerSubscriptionTransitionError,
} from "@/services/customer.service";

interface Params {
  params: { subscriptionId: string };
}

/**
 * PATCH /api/customer/subscriptions/[subscriptionId]/next-date
 * Body: { nextOrderAt: string } — ISO 8601 date string
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { subscriptionId } = params;
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (!body.nextOrderAt) {
      return NextResponse.json({ error: "nextOrderAt is required" }, { status: 400 });
    }

    const nextOrderAt = new Date(body.nextOrderAt);
    if (isNaN(nextOrderAt.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    await updateNextOrderDate(subscriptionId, ctx.email, nextOrderAt);
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
    console.error("[customer/subscriptions/next-date] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
