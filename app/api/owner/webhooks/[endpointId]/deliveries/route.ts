import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { listWebhookDeliveries } from "@/services/owner/owner-webhooks.service";

export async function GET(
  _req: Request,
  { params }: { params: { endpointId: string } }
) {
  const ctx = await requireAuth();
  try {
    const deliveries = await listWebhookDeliveries(ctx.tenantId, params.endpointId);
    return NextResponse.json({ data: deliveries });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
