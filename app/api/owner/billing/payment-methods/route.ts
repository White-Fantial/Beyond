import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import { prisma } from "@/lib/prisma";
import { stripeBillingAdapter } from "@/adapters/billing/stripe.adapter";

/**
 * GET /api/owner/billing/payment-methods
 *
 * Returns payment methods for the current owner's billing account.
 */
export async function GET(_req: NextRequest) {
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const ownerMembership = ctx.tenantMemberships.find((tm) =>
      OWNER_PORTAL_MEMBERSHIP_ROLES.includes(tm.membershipRole as never)
    );
    if (!ownerMembership && !ctx.isPlatformAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const tenantId = ownerMembership?.tenantId ?? ctx.tenantMemberships[0]?.tenantId;
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });

    const subscription = await prisma.tenantSubscription.findFirst({
      where: { tenantId },
      select: { providerCustomerId: true },
    });

    if (!subscription?.providerCustomerId) {
      return NextResponse.json({ data: [] });
    }

    const methods = await stripeBillingAdapter.listPaymentMethods(subscription.providerCustomerId);
    return NextResponse.json({ data: methods });
  } catch (err) {
    console.error("[payment-methods] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
