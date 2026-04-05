/**
 * Outbound webhook delivery library.
 *
 * Signs each payload with HMAC-SHA256 and POSTs to the endpoint URL.
 * Records every attempt in WebhookDelivery.
 */
import { createHmac, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export function generateWebhookSecret(): string {
  return "whsec_" + randomBytes(24).toString("hex");
}

export function signWebhookPayload(secret: string, rawBody: string): string {
  return createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

export interface DispatchWebhookInput {
  tenantId: string;
  event: string;
  payload: Record<string, unknown>;
}

/**
 * Finds all active endpoints subscribed to `event` for the tenant,
 * creates a WebhookDelivery record for each, then fires them all concurrently.
 */
export async function dispatchWebhook(input: DispatchWebhookInput): Promise<void> {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      tenantId: input.tenantId,
      isActive: true,
      events: { has: input.event },
    },
  });

  if (endpoints.length === 0) return;

  await Promise.allSettled(
    endpoints.map((ep) => deliverToEndpoint(ep.id, ep.url, ep.secret, input.event, input.payload))
  );
}

async function deliverToEndpoint(
  endpointId: string,
  url: string,
  secret: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
  const signature = signWebhookPayload(secret, body);

  let httpStatus: number | null = null;
  let responseBody: string | null = null;
  let status: "SUCCESS" | "FAILED" = "FAILED";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Beyond-Signature": signature,
        "X-Beyond-Event": event,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    httpStatus = res.status;
    responseBody = (await res.text()).slice(0, 1000);
    status = res.ok ? "SUCCESS" : "FAILED";
  } catch (err) {
    responseBody = err instanceof Error ? err.message : String(err);
  }

  await prisma.webhookDelivery.create({
    data: {
      endpointId,
      event,
      payload,
      status,
      httpStatus,
      responseBody,
      attemptCount: 1,
      lastAttemptAt: new Date(),
    },
  });
}
