/**
 * Owner Webhooks Service — Phase F.
 *
 * CRUD for WebhookEndpoint + delivery history, all scoped to tenantId.
 */
import { prisma } from "@/lib/prisma";
import { generateWebhookSecret } from "@/lib/webhooks/deliver";
import type {
  WebhookEndpoint,
  WebhookEndpointDetail,
  WebhookEndpointListResult,
  WebhookDelivery,
  WebhookDeliveryStatus,
  CreateWebhookEndpointInput,
} from "@/types/owner-webhooks";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toEndpoint(row: {
  id: string;
  tenantId: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): WebhookEndpoint {
  return {
    id: row.id,
    tenantId: row.tenantId,
    url: row.url,
    events: row.events,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDelivery(row: {
  id: string;
  endpointId: string;
  event: string;
  payload: unknown;
  status: string;
  httpStatus: number | null;
  responseBody: string | null;
  attemptCount: number;
  lastAttemptAt: Date | null;
  createdAt: Date;
}): WebhookDelivery {
  return {
    id: row.id,
    endpointId: row.endpointId,
    event: row.event,
    payload: row.payload as Record<string, unknown>,
    status: row.status as WebhookDeliveryStatus,
    httpStatus: row.httpStatus,
    responseBody: row.responseBody,
    attemptCount: row.attemptCount,
    lastAttemptAt: row.lastAttemptAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

// ─── Public functions ─────────────────────────────────────────────────────────

export async function listWebhookEndpoints(
  tenantId: string
): Promise<WebhookEndpointListResult> {
  const [rows, total] = await Promise.all([
    prisma.webhookEndpoint.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.webhookEndpoint.count({ where: { tenantId } }),
  ]);
  return { items: rows.map(toEndpoint), total };
}

export async function getWebhookEndpointDetail(
  tenantId: string,
  endpointId: string
): Promise<WebhookEndpointDetail> {
  const row = await prisma.webhookEndpoint.findFirst({
    where: { id: endpointId, tenantId },
    include: {
      deliveries: {
        orderBy: { createdAt: "desc" },
        take: 30,
      },
    },
  });
  if (!row) throw new Error(`WebhookEndpoint ${endpointId} not found`);

  return {
    ...toEndpoint(row),
    recentDeliveries: row.deliveries.map(toDelivery),
  };
}

export async function createWebhookEndpoint(
  tenantId: string,
  input: CreateWebhookEndpointInput
): Promise<WebhookEndpoint> {
  const secret = input.secret ?? generateWebhookSecret();
  const row = await prisma.webhookEndpoint.create({
    data: {
      tenantId,
      url: input.url,
      secret,
      events: input.events,
    },
  });
  return toEndpoint(row);
}

export async function toggleWebhookEndpoint(
  tenantId: string,
  endpointId: string
): Promise<WebhookEndpoint> {
  const existing = await prisma.webhookEndpoint.findFirst({
    where: { id: endpointId, tenantId },
  });
  if (!existing) throw new Error(`WebhookEndpoint ${endpointId} not found`);

  const row = await prisma.webhookEndpoint.update({
    where: { id: endpointId },
    data: { isActive: !existing.isActive },
  });
  return toEndpoint(row);
}

export async function deleteWebhookEndpoint(
  tenantId: string,
  endpointId: string
): Promise<void> {
  const existing = await prisma.webhookEndpoint.findFirst({
    where: { id: endpointId, tenantId },
  });
  if (!existing) throw new Error(`WebhookEndpoint ${endpointId} not found`);

  await prisma.webhookEndpoint.delete({ where: { id: endpointId } });
}

export async function listWebhookDeliveries(
  tenantId: string,
  endpointId: string,
  limit = 50
): Promise<WebhookDelivery[]> {
  // Verify ownership
  const endpoint = await prisma.webhookEndpoint.findFirst({
    where: { id: endpointId, tenantId },
  });
  if (!endpoint) throw new Error(`WebhookEndpoint ${endpointId} not found`);

  const rows = await prisma.webhookDelivery.findMany({
    where: { endpointId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(toDelivery);
}
