import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import {
  getWebhookEndpointDetail,
  deleteWebhookEndpoint,
} from "@/services/owner/owner-webhooks.service";

export async function GET(
  _req: Request,
  { params }: { params: { endpointId: string } }
) {
  const ctx = await requireAuth();
  try {
    const detail = await getWebhookEndpointDetail(ctx.tenantId, params.endpointId);
    return NextResponse.json({ data: detail });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { endpointId: string } }
) {
  const ctx = await requireAuth();
  try {
    await deleteWebhookEndpoint(ctx.tenantId, params.endpointId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error deleting endpoint";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
