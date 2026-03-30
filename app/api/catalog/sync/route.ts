import { NextRequest, NextResponse } from "next/server";
import { runLoyverseFullCatalogSync } from "@/services/catalog-sync.service";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { storeId, tenantId } = body as { storeId: string; tenantId: string };

  if (!storeId || !tenantId) {
    return NextResponse.json({ error: "storeId and tenantId are required" }, { status: 400 });
  }

  // Fetch the active Loyverse POS connection for this store
  const connection = await prisma.connection.findUnique({
    where: { storeId_provider_type: { storeId, provider: "LOYVERSE", type: "POS" } },
    include: {
      credentials: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!connection || connection.status !== "CONNECTED") {
    return NextResponse.json({ error: "No active Loyverse connection found" }, { status: 404 });
  }

  const credential = connection.credentials[0];
  if (!credential) {
    return NextResponse.json({ error: "No active credential for connection" }, { status: 404 });
  }

  // The configEncrypted stores the access token (plain for now — encryption layer is separate)
  const accessToken = credential.configEncrypted;

  try {
    const result = await runLoyverseFullCatalogSync({
      tenantId,
      storeId,
      connectionId: connection.id,
      accessToken,
    });

    // Update lastSyncAt on the connection
    await prisma.connection.update({
      where: { id: connection.id },
      data: { lastSyncAt: new Date(), lastSyncStatus: "SUCCESS" },
    });

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    await prisma.connection.update({
      where: { id: connection.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: "FAILED",
        lastErrorMessage: message,
      },
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
