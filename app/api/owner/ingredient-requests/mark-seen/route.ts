import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { markRequestsSeen } from "@/services/marketplace/ingredient-requests.service";

/**
 * PATCH /api/owner/ingredient-requests/mark-seen
 *
 * Marks all reviewed (non-PENDING) ingredient requests for the current tenant as seen
 * by the owner. Called automatically when the owner visits the ingredient requests page.
 */
export async function PATCH() {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant membership found" }, { status: 403 });
  }

  try {
    await markRequestsSeen(tenantId);
    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to mark requests as seen";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
