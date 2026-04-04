import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { getLoyaltyTransactions } from "@/services/customer.service";
import type { LoyaltyTransactionType } from "@/types/customer-loyalty";

/**
 * GET /api/customer/loyalty/transactions
 * Returns paginated loyalty transaction history.
 * Query params: page, pageSize, type (EARN | REDEEM | ADJUSTMENT)
 */
export async function GET(req: NextRequest) {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);
  const type = searchParams.get("type") as LoyaltyTransactionType | null;

  const result = await getLoyaltyTransactions(ctx.userId, {
    page: isNaN(page) ? 1 : page,
    pageSize: isNaN(pageSize) ? 20 : pageSize,
    ...(type ? { type } : {}),
  });

  return NextResponse.json({ data: result });
}
