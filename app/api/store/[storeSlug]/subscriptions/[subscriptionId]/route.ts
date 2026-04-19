import { NextRequest, NextResponse } from "next/server";
import { getGuestSubscriptionStatus } from "@/services/customer-menu.service";

/**
 * GET /api/store/[storeSlug]/subscriptions/[subscriptionId]
 *
 * Returns public subscription status. No authentication required.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { subscriptionId: string } }
) {
  const { subscriptionId } = params;
  const status = await getGuestSubscriptionStatus(subscriptionId);
  if (!status) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(status);
}
