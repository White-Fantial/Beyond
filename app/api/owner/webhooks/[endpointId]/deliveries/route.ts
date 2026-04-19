import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { listWebhookDeliveries } from "@/services/owner/owner-webhooks.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ endpointId: string }> }
) {
  const { endpointId } = await params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  try {
    const deliveries = await listWebhookDeliveries(tenantId, endpointId);
    return NextResponse.json({ data: deliveries });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
