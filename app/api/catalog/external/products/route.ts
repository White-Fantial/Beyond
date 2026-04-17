/**
 * GET /api/catalog/external/products?connectionId=&storeId=&limit=
 *
 * Returns normalised external products for a given channel connection.
 * Used for debugging and future mapping UI (Phase 2).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const connectionId = searchParams.get("connectionId");
  const storeId = searchParams.get("storeId");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 50;

  if (!connectionId) {
    return NextResponse.json(
      { error: "connectionId query param is required" },
      { status: 400 }
    );
  }

  const where: Record<string, string> = { connectionId };
  if (storeId) where["storeId"] = storeId;

  const products = await prisma.externalCatalogProduct.findMany({
    where,
    orderBy: { lastSyncedAt: "desc" },
    take: limit,
    select: {
      id: true,
      connectionId: true,
      channelType: true,
      externalId: true,
      externalParentId: true,
      normalizedName: true,
      normalizedPriceAmount: true,
      entityHash: true,
      importRunId: true,
      lastSyncedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ products });
}
