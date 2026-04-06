import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { toggleWebhookEndpoint } from "@/services/owner/owner-webhooks.service";

export async function POST(
  _req: Request,
  { params }: { params: { endpointId: string } }
) {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  try {
    const endpoint = await toggleWebhookEndpoint(tenantId, params.endpointId);
    return NextResponse.json({ data: endpoint });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error toggling endpoint";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
