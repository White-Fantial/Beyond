import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import {
  resumeOwnerSubscription,
  SubscriptionTransitionError,
} from "@/services/owner/subscription-management-service";

interface Params {
  params: Promise<{ subscriptionId: string }>;
}

/**
 * POST /api/owner/subscriptions/[subscriptionId]/resume
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const { subscriptionId } = await params;
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const ownerMembership = ctx.tenantMemberships.find((tm) =>
      OWNER_PORTAL_MEMBERSHIP_ROLES.includes(tm.membershipRole)
    );
    if (!ownerMembership && !ctx.isPlatformAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const tenantId = ownerMembership?.tenantId ?? ctx.tenantMemberships[0]?.tenantId;
    if (!tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 403 });

    await resumeOwnerSubscription(subscriptionId, tenantId, { userId: ctx.userId });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof SubscriptionTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "SUBSCRIPTION_NOT_FOUND") {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }
    if (msg === "CROSS_TENANT_ACCESS_DENIED") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("[owner/subscriptions/resume] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
