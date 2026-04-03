import { NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { markAllCustomerNotificationsRead } from "@/services/customer.service";

/**
 * POST /api/customer/notifications/read-all
 */
export async function POST() {
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    await markAllCustomerNotificationsRead(ctx.userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[customer/notifications/read-all]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
