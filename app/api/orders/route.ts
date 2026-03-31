/**
 * GET /api/orders?storeId=<id>[&status=RECEIVED,ACCEPTED][&sourceChannel=UBER_EATS]
 *                            [&from=ISO&to=ISO][&limit=50][&offset=0]
 *
 * Lists canonical orders for a store. Returns orders newest-first with line items.
 * Requires the caller to be authenticated with ORDERS permission for the store.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { listOrders } from "@/services/order.service";
import type { OrderStatus, OrderSourceChannel } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const storeId = searchParams.get("storeId");

  if (!storeId) {
    return NextResponse.json({ error: "storeId is required" }, { status: 400 });
  }

  await requireStorePermission(storeId, PERMISSIONS.ORDERS);

  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");
  const statusParam = searchParams.get("status");
  const sourceChannelParam = searchParams.get("sourceChannel");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 200) : 50;
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

  const status = statusParam
    ? (statusParam.split(",") as OrderStatus[])
    : undefined;
  const sourceChannel = sourceChannelParam
    ? (sourceChannelParam.split(",") as OrderSourceChannel[])
    : undefined;
  const from = fromParam ? new Date(fromParam) : undefined;
  const to = toParam ? new Date(toParam) : undefined;

  const result = await listOrders(storeId, { limit, offset, status, sourceChannel, from, to });

  return NextResponse.json(result);
}
