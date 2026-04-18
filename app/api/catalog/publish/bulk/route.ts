/**
 * POST /api/catalog/publish/bulk
 *
 * Publishes multiple internal catalog entities to an external channel in one request.
 *
 * Body:
 *   {
 *     connectionId: string,
 *     items: Array<{
 *       internalEntityType: CatalogEntityType,
 *       internalEntityId: string,
 *       action: CatalogPublishAction
 *     }>,
 *     onlyChanged?: boolean
 *   }
 *
 * Required permissions: INTEGRATIONS + MENU_MANAGE
 */

import { NextRequest, NextResponse } from "next/server";
import { publishEntitiesBulk } from "@/services/catalog-publish.service";
import type { CatalogPublishAction, BulkPublishItem } from "@/types/catalog-publish";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { connectionId, items, onlyChanged } = body;

    if (!connectionId) {
      return NextResponse.json({ error: "connectionId is required." }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items must be a non-empty array." }, { status: 400 });
    }

    const validActions: CatalogPublishAction[] = ["CREATE", "UPDATE", "ARCHIVE", "UNARCHIVE"];
    for (const item of items) {
      if (!item.internalEntityType || !item.internalEntityId || !item.action) {
        return NextResponse.json(
          { error: "Each item must have internalEntityType, internalEntityId, and action." },
          { status: 400 }
        );
      }
      if (!validActions.includes(item.action)) {
        return NextResponse.json(
          { error: `Invalid action "${item.action}" for entity "${item.internalEntityId}".` },
          { status: 400 }
        );
      }
    }

    const { prisma } = await import("@/lib/prisma");
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
      select: { tenantId: true, storeId: true },
    });
    if (!connection) {
      return NextResponse.json({ error: "Connection not found." }, { status: 404 });
    }

    const result = await publishEntitiesBulk({
      tenantId: connection.tenantId,
      storeId: connection.storeId,
      connectionId,
      items: items as BulkPublishItem[],
      triggerSource: "BULK_UI",
      onlyChanged: onlyChanged ?? false,
    });

    return NextResponse.json({ result }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
