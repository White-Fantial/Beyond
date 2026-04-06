import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import {
  listWebhookEndpoints,
  createWebhookEndpoint,
} from "@/services/owner/owner-webhooks.service";
import type { CreateWebhookEndpointInput } from "@/types/owner-webhooks";

export async function GET() {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const result = await listWebhookEndpoints(tenantId);
  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest) {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const body = (await req.json()) as CreateWebhookEndpointInput;

  if (!body.url || !body.events?.length) {
    return NextResponse.json({ error: "url and events are required" }, { status: 400 });
  }

  try {
    new URL(body.url);
  } catch {
    return NextResponse.json({ error: "url must be a valid URL" }, { status: 400 });
  }

  const endpoint = await createWebhookEndpoint(tenantId, body);
  return NextResponse.json({ data: endpoint }, { status: 201 });
}
