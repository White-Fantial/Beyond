/**
 * POST /api/webhooks/orders/[provider]
 *
 * Receives inbound order webhooks from delivery platforms (Uber Eats, DoorDash)
 * and POS systems. The provider slug maps to a ConnectionProvider enum value.
 *
 * Design:
 *  1. Log the raw request body to InboundWebhookLog immediately (audit trail).
 *  2. Validate the webhook signature where possible.
 *  3. Normalize the provider payload into CreateCanonicalOrderInput.
 *  4. Call createCanonicalOrderFromInbound() — idempotent via canonicalOrderKey.
 *  5. Mark the webhook log as processed (or failed).
 *
 * Query parameters:
 *  - storeId  (required) — identifies which store this webhook is for
 *
 * Supported provider slugs: uber-eats, doordash, pos
 */
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  logInboundWebhook,
  markWebhookLogProcessed,
  createCanonicalOrderFromInbound,
  type NormalizedOrderItem,
  type NormalizedOrderItemModifier,
} from "@/services/order.service";
import type { OrderChannelType } from "@prisma/client";

// ─── Provider slug → channel type mapping ────────────────────────────────────

const PROVIDER_CHANNEL_MAP: Record<string, OrderChannelType> = {
  "uber-eats": "UBER_EATS",
  doordash: "DOORDASH",
  pos: "POS",
  loyverse: "POS",
  online: "ONLINE",
};

// ─── Signature verification helpers ──────────────────────────────────────────

/**
 * Verify Uber Eats webhook signature.
 * Uber Eats signs payloads with HMAC-SHA256 and sends the signature in the
 * `x-uber-signature` header. Returns null (not verified) when the webhook
 * signing secret is not configured — we still log but flag signatureValid=false.
 */
async function verifyUberEatsSignature(
  req: NextRequest,
  rawBody: string
): Promise<boolean | null> {
  const sigHeader = req.headers.get("x-uber-signature");
  const secret = process.env.UBER_EATS_WEBHOOK_SECRET;
  if (!secret) return null; // secret not configured — can't verify
  if (!sigHeader) return false;

  const { createHmac } = await import("crypto");
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return sigHeader === expected || sigHeader === `sha256=${expected}`;
}

/**
 * Verify DoorDash webhook signature.
 * DoorDash signs using HMAC-SHA256 and sends signature in `x-doordash-signature`.
 */
async function verifyDoorDashSignature(
  req: NextRequest,
  rawBody: string
): Promise<boolean | null> {
  const sigHeader = req.headers.get("x-doordash-signature");
  const secret = process.env.DOORDASH_WEBHOOK_SECRET;
  if (!secret) return null;
  if (!sigHeader) return false;

  const { createHmac } = await import("crypto");
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return sigHeader === expected || sigHeader === `sha256=${expected}`;
}

// ─── Payload normalizers ──────────────────────────────────────────────────────

interface UberEatsOrderItem {
  id?: string;
  title?: string;
  sku?: string;
  quantity?: number;
  price?: { unit_price?: number; base_price?: number; total_price?: number };
  special_instructions?: string;
  selected_modifier_groups?: Array<{
    id?: string;
    title?: string;
    selected_items?: Array<{
      id?: string;
      title?: string;
      quantity?: number;
      price?: { unit_price?: number; total_price?: number };
    }>;
  }>;
}

interface UberEatsWebhookEnvelope {
  event_type?: string;
  resource_id?: string;
  resource_href?: string;
  meta?: {
    store_id?: string;
  };
}

interface UberEatsOrderPayload {
  order_id?: string;
  store?: { store_id?: string };
  type?: string;
  current_state?: string;
  placed_at?: string;
  estimated_ready_for_pickup_at?: string;
  subtotal?: number;
  tax?: number;
  tip?: number;
  total?: number;
  currency_code?: string;
  customer?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    email?: string;
  };
  cart?: {
    items?: UberEatsOrderItem[];
  };
  special_instructions?: string;
}

function normalizeUberEatsItems(items: UberEatsOrderItem[] = []): NormalizedOrderItem[] {
  return items.map((item) => {
    const modifiers: NormalizedOrderItemModifier[] = [];
    for (const group of item.selected_modifier_groups ?? []) {
      for (const sel of group.selected_items ?? []) {
        modifiers.push({
          modifierGroupName: group.title,
          modifierOptionName: sel.title ?? "Unknown",
          quantity: sel.quantity ?? 1,
          unitPriceAmount: sel.price?.unit_price ?? 0,
          totalPriceAmount: sel.price?.total_price ?? 0,
          sourceModifierGroupRef: group.id,
          sourceModifierOptionRef: sel.id,
          rawPayload: sel,
        });
      }
    }
    return {
      sourceProductRef: item.id,
      productName: item.title ?? "Unknown item",
      productSku: item.sku,
      quantity: item.quantity ?? 1,
      unitPriceAmount: item.price?.unit_price ?? item.price?.base_price ?? 0,
      totalPriceAmount: item.price?.total_price ?? 0,
      notes: item.special_instructions,
      rawPayload: item,
      modifiers,
    };
  });
}

interface DoorDashOrderItem {
  item_id?: string;
  name?: string;
  quantity?: number;
  price?: number;
  base_price?: number;
  options?: Array<{
    option_id?: string;
    name?: string;
    quantity?: number;
    price?: number;
    modifier_id?: string;
  }>;
  special_instructions?: string;
}

interface DoorDashOrderPayload {
  order_id?: string;
  external_delivery_id?: string;
  store_id?: string;
  status?: string;
  created_at?: string;
  subtotal?: number;
  tax?: number;
  tip?: number;
  order_value?: number;
  currency?: string;
  customer?: {
    first_name?: string;
    last_name?: string;
    phone_number?: string;
    email?: string;
  };
  order_items?: DoorDashOrderItem[];
  special_instructions?: string;
}

function normalizeDoorDashItems(items: DoorDashOrderItem[] = []): NormalizedOrderItem[] {
  return items.map((item) => {
    const modifiers: NormalizedOrderItemModifier[] = (item.options ?? []).map((opt) => ({
      modifierGroupName: opt.modifier_id,
      modifierOptionName: opt.name ?? "Unknown",
      quantity: opt.quantity ?? 1,
      unitPriceAmount: opt.price ?? 0,
      totalPriceAmount: (opt.price ?? 0) * (opt.quantity ?? 1),
      sourceModifierOptionRef: opt.option_id,
      sourceModifierGroupRef: opt.modifier_id,
      rawPayload: opt,
    }));
    const qty = item.quantity ?? 1;
    const unitPrice = item.price ?? item.base_price ?? 0;
    return {
      sourceProductRef: item.item_id,
      productName: item.name ?? "Unknown item",
      quantity: qty,
      unitPriceAmount: unitPrice,
      totalPriceAmount: unitPrice * qty,
      notes: item.special_instructions,
      rawPayload: item,
      modifiers,
    };
  });
}

interface LoyverseOrderPayload {
  id?: string;
  order_id?: string;
  total_money?: number;
  total?: number;
  created_at?: string;
  customer?: { name?: string; phone_number?: string; email?: string };
  line_items?: Array<{
    item_id?: string;
    item_name?: string;
    quantity?: number;
    price?: number;
    total?: number;
    modifiers?: Array<{
      modifier_id?: string;
      modifier_name?: string;
      quantity?: number;
      price?: number;
      total?: number;
    }>;
  }>;
}

function normalizeLoyverseItems(items: LoyverseOrderPayload["line_items"] = []): NormalizedOrderItem[] {
  return (items ?? []).map((item) => {
    const qty = item.quantity ?? 1;
    const unitPrice = item.price ?? 0;
    const modifiers: NormalizedOrderItemModifier[] = (item.modifiers ?? []).map((mod) => ({
      sourceModifierOptionRef: mod.modifier_id,
      modifierOptionName: mod.modifier_name ?? "Unknown",
      quantity: mod.quantity ?? 1,
      unitPriceAmount: mod.price ?? 0,
      totalPriceAmount: mod.total ?? (mod.price ?? 0) * (mod.quantity ?? 1),
      rawPayload: mod,
    }));
    return {
      sourceProductRef: item.item_id,
      productName: item.item_name ?? "Unknown item",
      quantity: qty,
      unitPriceAmount: unitPrice,
      totalPriceAmount: item.total ?? unitPrice * qty,
      modifiers,
      rawPayload: item,
    };
  });
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerSlug } = await params;
  const channelType = PROVIDER_CHANNEL_MAP[providerSlug];

  if (!channelType) {
    return NextResponse.json(
      { error: `Unsupported provider slug: ${providerSlug}` },
      { status: 400 }
    );
  }

  // Read raw body text for signature verification before parsing
  const rawBody = await req.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Collect request headers for audit
  const requestHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    requestHeaders[key] = value;
  });

  // Verify signature
  let signatureValid: boolean | null = null;
  if (channelType === "UBER_EATS") {
    signatureValid = await verifyUberEatsSignature(req, rawBody);
  } else if (channelType === "DOORDASH") {
    signatureValid = await verifyDoorDashSignature(req, rawBody);
  }

  // Reject if signature is explicitly invalid (null = secret not configured = allow through)
  if (signatureValid === false) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  const storeId = req.nextUrl.searchParams.get("storeId") ?? undefined;

  // Look up the connection for this store + channel
  let connection: { id: string; storeId: string; tenantId: string } | null = null;
  if (storeId) {
    const providerEnum = channelType === "UBER_EATS"
      ? "UBER_EATS"
      : channelType === "DOORDASH"
      ? "DOORDASH"
      : "LOYVERSE"; // POS fallback — extend as needed

    connection = await prisma.connection.findFirst({
      where: { storeId, provider: providerEnum, status: "CONNECTED" },
      select: { id: true, storeId: true, tenantId: true },
    });
  }

  // Log the raw webhook immediately
  const eventName = typeof body.event_type === "string"
    ? body.event_type
    : typeof body.type === "string"
    ? body.type
    : "order_webhook";

  const webhookLog = await logInboundWebhook({
    tenantId: connection?.tenantId,
    storeId: connection?.storeId ?? storeId,
    connectionId: connection?.id,
    channelType,
    eventName,
    externalEventRef:
      typeof body.event_id === "string" ? body.event_id : undefined,
    signatureValid: signatureValid ?? undefined,
    processingStatus: "PROCESSING",
    requestHeaders,
    requestBody: body,
  });

  try {
    if (!connection) {
      await markWebhookLogProcessed(
        webhookLog.id,
        "SKIPPED",
        `No CONNECTED ${channelType} connection found for storeId=${storeId ?? "(none)"}`
      );
      // Return 200 to prevent platform from retrying a mis-configured webhook
      return NextResponse.json({ ok: true, skipped: true });
    }

    // ── Normalize payload per provider ──────────────────────────────────────

    if (channelType === "UBER_EATS") {
      const payload = body as unknown as UberEatsOrderPayload;
      const envelope = body as unknown as UberEatsWebhookEnvelope;

      const externalOrderRef =
        payload.order_id ??
        envelope.resource_id ??
        (typeof envelope.resource_href === "string" ? envelope.resource_href.split("/").pop() : undefined);
      if (!externalOrderRef) {
        await markWebhookLogProcessed(webhookLog.id, "SKIPPED", "Missing order_id/resource_id");
        return NextResponse.json({ ok: true, skipped: true });
      }

      const customer = payload.customer;
      const customerName = [customer?.first_name, customer?.last_name]
        .filter(Boolean)
        .join(" ") || undefined;

      const { order, created } = await createCanonicalOrderFromInbound({
        tenantId: connection.tenantId,
        storeId: connection.storeId,
        channelType: "UBER_EATS",
        connectionId: connection.id,
        externalOrderRef,
        orderedAt: payload.placed_at ? new Date(payload.placed_at) : new Date(),
        subtotalAmount: payload.subtotal ?? 0,
        taxAmount: payload.tax ?? 0,
        tipAmount: payload.tip ?? 0,
        totalAmount: payload.total ?? 0,
        currencyCode: payload.currency_code ?? "USD",
        customerName,
        customerPhone: customer?.phone,
        customerEmail: customer?.email,
        notes: payload.special_instructions,
        items: normalizeUberEatsItems(payload.cart?.items),
        rawPayload: body,
      });

      await markWebhookLogProcessed(webhookLog.id, "PROCESSED");
      return NextResponse.json({ ok: true, orderId: order.id, created });
    }

    if (channelType === "DOORDASH") {
      const payload = body as unknown as DoorDashOrderPayload;

      const externalOrderRef =
        payload.order_id ?? payload.external_delivery_id;
      if (!externalOrderRef) {
        await markWebhookLogProcessed(webhookLog.id, "SKIPPED", "Missing order_id");
        return NextResponse.json({ ok: true, skipped: true });
      }

      const customer = payload.customer;
      const customerName = [customer?.first_name, customer?.last_name]
        .filter(Boolean)
        .join(" ") || undefined;

      const { order, created } = await createCanonicalOrderFromInbound({
        tenantId: connection.tenantId,
        storeId: connection.storeId,
        channelType: "DOORDASH",
        connectionId: connection.id,
        externalOrderRef,
        orderedAt: payload.created_at ? new Date(payload.created_at) : new Date(),
        subtotalAmount: payload.subtotal ?? 0,
        taxAmount: payload.tax ?? 0,
        tipAmount: payload.tip ?? 0,
        totalAmount: payload.order_value ?? 0,
        currencyCode: payload.currency ?? "USD",
        customerName,
        customerPhone: customer?.phone_number,
        customerEmail: customer?.email,
        notes: payload.special_instructions,
        items: normalizeDoorDashItems(payload.order_items),
        rawPayload: body,
      });

      await markWebhookLogProcessed(webhookLog.id, "PROCESSED");
      return NextResponse.json({ ok: true, orderId: order.id, created });
    }

    if (providerSlug === "loyverse") {
      const payload = body as unknown as LoyverseOrderPayload;
      const externalOrderRef = payload.order_id ?? payload.id;
      if (!externalOrderRef) {
        await markWebhookLogProcessed(webhookLog.id, "SKIPPED", "Missing order_id");
        return NextResponse.json({ ok: true, skipped: true });
      }

      const { order, created } = await createCanonicalOrderFromInbound({
        tenantId: connection.tenantId,
        storeId: connection.storeId,
        channelType: "POS",
        connectionId: connection.id,
        externalOrderRef,
        orderedAt: payload.created_at ? new Date(payload.created_at) : new Date(),
        totalAmount: payload.total_money ?? payload.total ?? 0,
        customerName: payload.customer?.name,
        customerPhone: payload.customer?.phone_number,
        customerEmail: payload.customer?.email,
        items: normalizeLoyverseItems(payload.line_items),
        rawPayload: body,
      });

      await markWebhookLogProcessed(webhookLog.id, "PROCESSED");
      return NextResponse.json({ ok: true, orderId: order.id, created });
    }

    // Unknown channel — log and skip
    await markWebhookLogProcessed(
      webhookLog.id,
      "SKIPPED",
      `Unhandled channelType: ${channelType}`
    );
    return NextResponse.json({ ok: true, skipped: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markWebhookLogProcessed(webhookLog.id, "FAILED", message).catch(() => {});
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
