import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import { prisma } from "@/lib/prisma";
import { stripeBillingAdapter } from "@/adapters/billing/stripe.adapter";

/**
 * DELETE /api/owner/billing/payment-methods/[paymentMethodId]
 *
 * Detaches a payment method from the customer's account.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { paymentMethodId: string } }
) {
  try {
    const { paymentMethodId } = params;
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
      return NextResponse.json({ error: "No billing account" }, { status: 404 });
    }

    const success = await stripeBillingAdapter.detachPaymentMethod(paymentMethodId);
    if (!success) {
      return NextResponse.json({ error: "Failed to remove payment method" }, { status: 422 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[payment-methods/delete] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
