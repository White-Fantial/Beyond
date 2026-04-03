import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripeBillingAdapter } from "@/adapters/billing/stripe.adapter";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/webhooks/billing/stripe
 *
 * Handles Stripe webhook events:
 *  - invoice.paid                    → mark BillingInvoice PAID, PaymentAttempt SUCCEEDED
 *  - invoice.payment_failed          → mark BillingInvoice OPEN, PaymentAttempt FAILED, subscription PAST_DUE
 *  - customer.subscription.updated  → sync TenantSubscription status/period
 *  - customer.subscription.deleted  → mark TenantSubscription CANCELLED
 *
 * All handlers are idempotent (safe to replay).
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  const event = stripeBillingAdapter.verifyWebhookSignature(body, signature);
  if (!event) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        // Unhandled event type — acknowledge receipt
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe-webhook] Handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (!invoice.id) return;

  const localInvoice = await prisma.billingInvoice.findFirst({
    where: { providerInvoiceId: invoice.id },
    select: { id: true, tenantId: true, subscriptionId: true, status: true },
  });
  if (!localInvoice || localInvoice.status === "PAID") return; // idempotent

  await prisma.$transaction([
    prisma.billingInvoice.update({
      where: { id: localInvoice.id },
      data: {
        status: "PAID" as never,
        amountPaidMinor: invoice.amount_paid,
        amountDueMinor: 0,
        paidAt: invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000)
          : new Date(),
      },
    }),
    prisma.paymentAttempt.create({
      data: {
        tenantId: localInvoice.tenantId,
        invoiceId: localInvoice.id,
        providerPaymentIntentId: null,
        status: "SUCCEEDED" as never,
        attemptedAt: new Date(),
        retryable: false,
      },
    }),
  ]);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.id) return;

  const localInvoice = await prisma.billingInvoice.findFirst({
    where: { providerInvoiceId: invoice.id },
    select: { id: true, tenantId: true, subscriptionId: true },
  });
  if (!localInvoice) return;

  const lastAttemptError = invoice.last_finalization_error;

  await prisma.$transaction([
    prisma.billingInvoice.update({
      where: { id: localInvoice.id },
      data: { status: "OPEN" as never },
    }),
    prisma.paymentAttempt.create({
      data: {
        tenantId: localInvoice.tenantId,
        invoiceId: localInvoice.id,
        providerPaymentIntentId: null,
        status: "FAILED" as never,
        attemptedAt: new Date(),
        failureCode: lastAttemptError?.code ?? null,
        failureMessage: lastAttemptError?.message ?? null,
        retryable: true,
      },
    }),
  ]);

  // Transition subscription to PAST_DUE if it's currently ACTIVE
  if (localInvoice.subscriptionId) {
    await prisma.tenantSubscription.updateMany({
      where: {
        id: localInvoice.subscriptionId,
        status: "ACTIVE" as never,
      },
      data: { status: "PAST_DUE" as never },
    });
  }
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const localSub = await prisma.tenantSubscription.findFirst({
    where: { providerSubscriptionId: sub.id },
    select: { id: true, tenantId: true, status: true },
  });
  if (!localSub) return;

  const statusMap: Record<string, string> = {
    active: "ACTIVE",
    trialing: "TRIAL",
    past_due: "PAST_DUE",
    canceled: "CANCELLED",
    unpaid: "SUSPENDED",
    incomplete: "INCOMPLETE",
    incomplete_expired: "EXPIRED",
  };
  const newStatus = statusMap[sub.status] ?? localSub.status;

  const periodItem = sub.items.data[0];
  await prisma.tenantSubscription.update({
    where: { id: localSub.id },
    data: {
      status: newStatus as never,
      currentPeriodStart: periodItem
        ? new Date(periodItem.current_period_start * 1000)
        : undefined,
      currentPeriodEnd: periodItem
        ? new Date(periodItem.current_period_end * 1000)
        : undefined,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const localSub = await prisma.tenantSubscription.findFirst({
    where: { providerSubscriptionId: sub.id },
    select: { id: true, tenantId: true, status: true },
  });
  if (!localSub || localSub.status === "CANCELLED") return; // idempotent

  await prisma.$transaction([
    prisma.tenantSubscription.update({
      where: { id: localSub.id },
      data: { status: "CANCELLED" as never, cancelledAt: new Date() },
    }),
    prisma.tenantSubscriptionEvent.create({
      data: {
        tenantSubscriptionId: localSub.id,
        tenantId: localSub.tenantId,
        eventType: "STATUS_CHANGED" as never,
        fromStatus: localSub.status,
        toStatus: "CANCELLED",
        note: "Cancelled via Stripe webhook",
      },
    }),
  ]);
}
