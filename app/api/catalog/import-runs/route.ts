/**
 * GET /api/catalog/import-runs?storeId=&connectionId=&limit=
 *
 * Returns recent catalog import runs for a store/connection.
 * Used for status monitoring and debugging (Phase 2).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const storeId = searchParams.get("storeId");
  const connectionId = searchParams.get("connectionId");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 20;

  if (!storeId) {
    return NextResponse.json({ error: "storeId query param is required" }, { status: 400 });
  }

  const where: Record<string, string> = { storeId };
  if (connectionId) where["connectionId"] = connectionId;

  const runs = await prisma.catalogImportRun.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      tenantId: true,
      storeId: true,
      connectionId: true,
      provider: true,
      status: true,
      startedAt: true,
      completedAt: true,
      importedCategoriesCount: true,
      importedProductsCount: true,
      importedModifierGroupsCount: true,
      importedModifierOptionsCount: true,
      errorMessage: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ runs });
}
