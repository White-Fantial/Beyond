/**
 * POST /api/catalog/import
 *
 * Triggers a full catalog import from an external channel connection.
 *
 * Body: { storeId: string, connectionId: string }
 *
 * The route resolves provider + credentials from the Connection record and
 * delegates to runFullCatalogImport. External data is stored in external
 * catalog tables only — the internal catalog is never modified (Phase 2).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runFullCatalogImport } from "@/services/catalog-import.service";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { storeId?: string; connectionId?: string };
  const { storeId, connectionId } = body;

  if (!storeId || !connectionId) {
    return NextResponse.json(
      { error: "storeId and connectionId are required" },
      { status: 400 }
    );
  }

  // Resolve connection + active credential
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
    include: {
      credentials: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!connection || connection.storeId !== storeId) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  if (connection.status !== "CONNECTED") {
    return NextResponse.json({ error: "Connection is not in CONNECTED state" }, { status: 422 });
  }

  const credential = connection.credentials[0];
  if (!credential) {
    return NextResponse.json(
      { error: "No active credential for connection" },
      { status: 422 }
    );
  }

  const result = await runFullCatalogImport({
    tenantId: connection.tenantId,
    storeId: connection.storeId,
    connectionId: connection.id,
    provider: connection.provider,
    credentials: {
      accessToken: credential.configEncrypted,
      configEncrypted: credential.configEncrypted,
    },
  });

  const httpStatus = result.status === "SUCCEEDED" ? 200 : 500;
  return NextResponse.json({ ok: result.status === "SUCCEEDED", result }, { status: httpStatus });
}
