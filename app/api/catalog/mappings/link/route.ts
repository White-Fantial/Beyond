/**
 * POST /api/catalog/mappings/link
 *
 * Manually link an internal entity to an external entity.
 *
 * Body:
 * {
 *   connectionId: string
 *   internalEntityType: CatalogEntityType
 *   internalEntityId: string
 *   externalEntityType: CatalogEntityType
 *   externalEntityId: string
 *   notes?: string
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { linkEntityManually } from "@/services/catalog-mapping.service";
import type { CatalogEntityType } from "@/types/catalog-mapping";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    connectionId?: string;
    internalEntityType?: string;
    internalEntityId?: string;
    externalEntityType?: string;
    externalEntityId?: string;
    notes?: string;
  };

  const { connectionId, internalEntityType, internalEntityId, externalEntityType, externalEntityId, notes } = body;

  if (!connectionId || !internalEntityType || !internalEntityId || !externalEntityType || !externalEntityId) {
    return NextResponse.json(
      { error: "connectionId, internalEntityType, internalEntityId, externalEntityType, externalEntityId are required" },
      { status: 400 }
    );
  }

  // Resolve tenantId/storeId from connection.
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
    select: { tenantId: true, storeId: true },
  });
  if (!connection) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  try {
    const mapping = await linkEntityManually({
      tenantId: connection.tenantId,
      storeId: connection.storeId,
      connectionId,
      internalEntityType: internalEntityType as CatalogEntityType,
      internalEntityId,
      externalEntityType: externalEntityType as CatalogEntityType,
      externalEntityId,
      notes,
    });
    return NextResponse.json({ ok: true, mapping });
  } catch (err) {
    const message = err instanceof Error ? err.message : "link failed";
    return NextResponse.json({ ok: false, error: message }, { status: 422 });
  }
}
