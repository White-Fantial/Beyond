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
  const { endpointId } = params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  try {
    const detail = await getWebhookEndpointDetail(tenantId, endpointId);
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
  const { endpointId } = params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  try {
    await deleteWebhookEndpoint(tenantId, endpointId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error deleting endpoint";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
