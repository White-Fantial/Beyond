/**
 * POST /api/integrations/connect
 *
 * Initiates the OAuth flow for a given provider and store.
 * Returns a redirect URL to send the user to the provider's auth page.
 *
 * Body: { storeId, provider, connectionType }
 * Response: { redirectUrl: string }
 */

import { type NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import { startOAuthFlow } from "@/services/integration.service";
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

    // Verify the user belongs to the tenant that owns this store
    const tenantId = ctx.tenantMemberships[0]?.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant membership found." }, { status: 403 });
    }

    const appBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host")}`;

    const { redirectUrl } = await startOAuthFlow({
      tenantId,
      storeId,
      provider: provider as ConnectionProvider,
      connectionType: connectionType as ConnectionType,
      requestedByUserId: ctx.userId,
      appBaseUrl,
    });

    return NextResponse.json({ redirectUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[api/integrations/connect] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
