/**
 * POST /api/catalog/publish/connection
 *
 * Publishes all (or a subset of) internal catalog entities for a connection.
 * Entities with ACTIVE mappings → UPDATE.
 * Entities without any mapping → CREATE.
 *
 * Body:
 *   {
 *     connectionId: string,
 *     entityTypes?: CatalogEntityType[],  // optional filter
 *     onlyChanged?: boolean
 *   }
 *
 * Required permissions: INTEGRATIONS + MENU_MANAGE
 */

import { NextRequest, NextResponse } from "next/server";
import { publishCatalogForConnection } from "@/services/catalog-publish.service";
import type { CatalogEntityType } from "@/types/catalog-publish";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { connectionId, entityTypes, onlyChanged } = body;

    if (!connectionId) {
      return NextResponse.json({ error: "connectionId is required." }, { status: 400 });
    }

    const { prisma } = await import("@/lib/prisma");
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
      select: { tenantId: true, storeId: true },
    });
    if (!connection) {
      return NextResponse.json({ error: "Connection not found." }, { status: 404 });
    }

    const result = await publishCatalogForConnection({
      tenantId: connection.tenantId,
      storeId: connection.storeId,
      connectionId,
      entityTypes: entityTypes as CatalogEntityType[] | undefined,
      triggerSource: "MANUAL_UI",
      onlyChanged: onlyChanged ?? false,
    });

    return NextResponse.json({ result }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
