import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import { updateOwnerCustomerNote } from "@/services/owner/customer-service";

interface Params {
  params: { customerId: string };
}

/**
 * PATCH /api/owner/customers/[customerId]/notes
 * Body: { note: string }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { customerId } = params;
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

    const body = await req.json().catch(() => ({}));
    if (typeof body.note !== "string") {
      return NextResponse.json({ error: "note (string) is required" }, { status: 400 });
    }

    await updateOwnerCustomerNote(customerId, tenantId, body.note, {
      userId: ctx.userId,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "CUSTOMER_NOT_FOUND") {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    console.error("[owner/customers/notes] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
