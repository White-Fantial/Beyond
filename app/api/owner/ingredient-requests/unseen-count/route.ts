import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { countUnseenRequests } from "@/services/marketplace/ingredient-requests.service";

/**
 * GET /api/owner/ingredient-requests/unseen-count
 *
 * Returns the count of ingredient requests that have been reviewed but not yet
 * acknowledged by the owner. Used to drive the navigation badge.
 */
export async function GET() {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  if (!tenantId) {
    return NextResponse.json({ data: { count: 0 } });
  }

  try {
    const count = await countUnseenRequests(tenantId);
    return NextResponse.json({ data: { count } });
  } catch {
    return NextResponse.json({ data: { count: 0 } });
  }
}
