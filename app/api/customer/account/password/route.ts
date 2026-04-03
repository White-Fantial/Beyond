import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import {
  changeCustomerPassword,
  CustomerPasswordError,
} from "@/services/customer.service";

/**
 * PATCH /api/customer/account/password
 * Body: { currentPassword: string, newPassword: string }
 */
export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (!body.currentPassword || !body.newPassword) {
      return NextResponse.json(
        { error: "currentPassword and newPassword are required" },
        { status: 400 }
      );
    }

    await changeCustomerPassword(ctx.userId, body.currentPassword, body.newPassword);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof CustomerPasswordError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("[customer/account/password] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
