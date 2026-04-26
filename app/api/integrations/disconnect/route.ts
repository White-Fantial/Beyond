/**
 * POST /api/integrations/disconnect
 *
 * Soft-disconnects a provider from a store.
 * Deactivates all active credentials and sets connection status to DISCONNECTED.
 *
 * Body: { storeId, provider, connectionType }
 * Response: { success: true }
 */

import { type NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { disconnectProvider } from "@/services/integration.service";
import type { ConnectionProvider, ConnectionType } from "@prisma/client";

const ALLOWED_PROVIDERS: ConnectionProvider[] = ["LOYVERSE", "LIGHTSPEED", "UBER_EATS", "DOORDASH"];
const ALLOWED_TYPES: ConnectionType[] = ["POS", "DELIVERY", "PAYMENT"];

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission(PERMISSIONS.INTEGRATIONS);

    const body = await req.json();
    const { storeId, provider, connectionType } = body as {
      storeId?: string;
      provider?: string;
      connectionType?: string;
    };

    if (!storeId || typeof storeId !== "string") {
      return NextResponse.json({ error: "storeId is required." }, { status: 400 });
    }
    if (!provider || !ALLOWED_PROVIDERS.includes(provider as ConnectionProvider)) {
      return NextResponse.json(
        { error: `provider must be one of: ${ALLOWED_PROVIDERS.join(", ")}` },
        { status: 400 }
      );
    }
    if (!connectionType || !ALLOWED_TYPES.includes(connectionType as ConnectionType)) {
      return NextResponse.json(
        { error: `connectionType must be one of: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const tenantId = ctx.tenantMemberships[0]?.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant membership found." }, { status: 403 });
    }

    await disconnectProvider(
      tenantId,
      storeId,
      provider as ConnectionProvider,
      connectionType as ConnectionType,
      ctx.userId
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[api/integrations/disconnect] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
