import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import {
  markCustomerNotificationRead,
  CustomerNotificationNotFoundError,
} from "@/services/customer.service";

interface Params {
  params: Promise<{ notificationId: string }>;
}

/**
 * PATCH /api/customer/notifications/[notificationId]/read
 */
export async function PATCH(_req: NextRequest, { params }: Params) {
  const { notificationId } = await params;
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    await markCustomerNotificationRead(ctx.userId, notificationId);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof CustomerNotificationNotFoundError) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }
    console.error("[customer/notifications/read]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
