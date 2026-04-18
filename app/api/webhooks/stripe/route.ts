import { NextRequest, NextResponse } from "next/server";
import { verifyStripeWebhookEvent } from "@/lib/stripe/connect";
import { handlePurchaseWebhook } from "@/services/marketplace/recipe-purchase.service";

/**
 * Stripe webhook endpoint.
 * Handles: payment_intent.succeeded
 *
 * NOTE: Next.js must not parse this body — Stripe signature verification
 * requires the raw bytes. The route therefore uses req.text() / req.arrayBuffer().
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let payload: string;
  try {
    payload = await req.text();
  } catch {
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
  }

  let event;
  try {
    event = verifyStripeWebhookEvent(payload, signature);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook signature verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    await handlePurchaseWebhook(event as Parameters<typeof handlePurchaseWebhook>[0]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook processing failed";
    console.error("[stripe-webhook] Error processing event", event.type, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
