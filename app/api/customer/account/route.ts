import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { updateCustomerName } from "@/services/customer.service";

/**
 * PATCH /api/customer/account
 * Body: { name: string }
 */
export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    await updateCustomerName(ctx.userId, body.name);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Name cannot be empty.") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[customer/account] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
