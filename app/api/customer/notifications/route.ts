import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { listCustomerNotifications } from "@/services/customer.service";

/**
 * GET /api/customer/notifications
 * Query: ?unreadOnly=true&page=1&pageSize=50
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await getCurrentUserAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "50", 10)));

    const result = await listCustomerNotifications(ctx.userId, { unreadOnly, page, pageSize });
    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("[customer/notifications GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
