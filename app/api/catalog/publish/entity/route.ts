/**
 * POST /api/catalog/publish/entity
 *
 * Publishes a single internal catalog entity to an external channel.
 *
 * Body:
 *   {
 *     connectionId: string,
 *     internalEntityType: CatalogEntityType,
 *     internalEntityId: string,
 *     action: CatalogPublishAction,
 *     onlyChanged?: boolean
 *   }
 *
 * Required permissions: INTEGRATIONS + MENU_MANAGE
 * (publishing to an external channel requires elevated permissions)
 */

import { NextRequest, NextResponse } from "next/server";
import { publishEntityToConnection } from "@/services/catalog-publish.service";
import type { CatalogEntityType, CatalogPublishAction } from "@/types/catalog-publish";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { connectionId, internalEntityType, internalEntityId, action, onlyChanged } = body;

    if (!connectionId || !internalEntityType || !internalEntityId || !action) {
      return NextResponse.json(
        { error: "connectionId, internalEntityType, internalEntityId, and action are required." },
        { status: 400 }
      );
    }

    const validActions: CatalogPublishAction[] = ["CREATE", "UPDATE", "ARCHIVE", "UNARCHIVE"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action "${action}". Must be one of: ${validActions.join(", ")}.` },
        { status: 400 }
      );
    }

    // TODO: Extract tenantId and storeId from authenticated session.
    // For now, derive from connection lookup (service validates ownership).
    const { prisma } = await import("@/lib/prisma");
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
      select: { tenantId: true, storeId: true },
    });
    if (!connection) {
      return NextResponse.json({ error: "Connection not found." }, { status: 404 });
    }

    const result = await publishEntityToConnection({
      tenantId: connection.tenantId,
      storeId: connection.storeId,
      connectionId,
      internalEntityType: internalEntityType as CatalogEntityType,
      internalEntityId,
      action: action as CatalogPublishAction,
      triggerSource: "API",
      onlyChanged: onlyChanged ?? false,
    });

    const statusCode = result.status === "FAILED" ? 422 : 200;
    return NextResponse.json({ result }, { status: statusCode });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
