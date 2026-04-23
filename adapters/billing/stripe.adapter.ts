/**
 * Stripe Billing Provider Adapter
 *
 * Implements BillingProviderAdapter using the Stripe Node.js SDK.
 * Configure via environment variables:
 *   STRIPE_SECRET_KEY       — required for all Stripe API calls
 *   STRIPE_WEBHOOK_SECRET   — required for webhook signature verification
 */
import Stripe from "stripe";
import type {
  BillingProviderAdapter,
  ProviderSubscriptionData,
  ProviderInvoiceData,
  ProviderPlanChangePreview,
  ProviderPaymentMethodSummary,
} from "./billing-provider.adapter";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
}

export class StripeBillingAdapter implements BillingProviderAdapter {
  async getSubscription(
    providerSubscriptionId: string
  ): Promise<ProviderSubscriptionData | null> {
    const stripe = getStripe();
    try {
      const sub = await stripe.subscriptions.retrieve(providerSubscriptionId);
      const periodItem = sub.items.data[0];
      return {
        providerSubscriptionId: sub.id,
        status: sub.status,
        currentPeriodStart: periodItem
          ? new Date(periodItem.current_period_start * 1000)
          : null,
        currentPeriodEnd: periodItem
          ? new Date(periodItem.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      };
    } catch (err) {
      if ((err as InstanceType<typeof Stripe.errors.StripeError>).code === "resource_missing") {
        return null;
      }
      throw err;
    }
  }

  async listInvoices(providerCustomerId: string): Promise<ProviderInvoiceData[]> {
    const stripe = getStripe();
    const list = await stripe.invoices.list({
      customer: providerCustomerId,
      limit: 100,
    });
    return list.data.map((inv) => ({
      providerInvoiceId: inv.id,
      invoiceNumber: inv.number ?? null,
      status: inv.status ?? "draft",
      currency: inv.currency.toUpperCase(),
      totalMinor: inv.total,
      amountDueMinor: inv.amount_due,
      amountPaidMinor: inv.amount_paid,
      billedAt: inv.created ? new Date(inv.created * 1000) : null,
      dueAt: inv.due_date ? new Date(inv.due_date * 1000) : null,
      paidAt: inv.status_transitions.paid_at
        ? new Date(inv.status_transitions.paid_at * 1000)
        : null,
      hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
      pdfUrl: inv.invoice_pdf ?? null,
    }));
  }

  async previewPlanChange(
    providerSubscriptionId: string,
    targetProviderPriceId: string
  ): Promise<ProviderPlanChangePreview | null> {
    const stripe = getStripe();
    try {
      const sub = await stripe.subscriptions.retrieve(providerSubscriptionId, {
        expand: ["items"],
      });
      const currentItem = sub.items.data[0];
      if (!currentItem) return null;

      const preview = await stripe.invoices.createPreview({
        customer: sub.customer as string,
        subscription: providerSubscriptionId,
        subscription_details: {
          items: [{ id: currentItem.id, price: targetProviderPriceId }],
          proration_behavior: "create_prorations",
        },
      });

      const prorationLines = preview.lines.data.filter(
        (l) =>
          l.parent?.subscription_item_details?.proration === true ||
          l.parent?.invoice_item_details?.proration === true
      );
      const prorationMinor = prorationLines.reduce((sum, l) => sum + l.amount, 0);

      return {
        prorationMinor: prorationMinor !== 0 ? prorationMinor : null,
        effectiveAt: preview.period_start ? new Date(preview.period_start * 1000) : null,
        previewLines: preview.lines.data.map((l) => ({
          description: l.description ?? "",
          amountMinor: l.amount,
        })),
      };
    } catch {
      return null;
    }
  }

  async applyPlanChange(
    providerSubscriptionId: string,
    targetProviderPriceId: string,
    immediate: boolean
  ): Promise<boolean> {
    const stripe = getStripe();
    try {
      const sub = await stripe.subscriptions.retrieve(providerSubscriptionId, {
        expand: ["items"],
      });
      const currentItem = sub.items.data[0];
      if (!currentItem) return false;

      await stripe.subscriptions.update(providerSubscriptionId, {
        items: [{ id: currentItem.id, price: targetProviderPriceId }],
        proration_behavior: immediate ? "create_prorations" : "none",
        billing_cycle_anchor: immediate ? "now" : undefined,
      });
      return true;
    } catch {
      return false;
    }
  }

  async retryInvoicePayment(providerInvoiceId: string): Promise<boolean> {
    const stripe = getStripe();
    try {
      await stripe.invoices.pay(providerInvoiceId);
      return true;
    } catch {
      return false;
    }
  }

  async getPaymentMethodSummary(
    providerCustomerId: string
  ): Promise<ProviderPaymentMethodSummary | null> {
    const stripe = getStripe();
    try {
      const methods = await stripe.paymentMethods.list({
        customer: providerCustomerId,
        type: "card",
        limit: 1,
      });
      const pm = methods.data[0];
      if (!pm || pm.type !== "card" || !pm.card) return null;
      return {
        type: "card",
        last4: pm.card.last4 ?? null,
        brand: pm.card.brand ?? null,
        expiryMonth: pm.card.exp_month ?? null,
        expiryYear: pm.card.exp_year ?? null,
      };
    } catch {
      return null;
    }
  }

  /** Attach an existing payment method to a customer */
  async attachPaymentMethod(
    providerMethodId: string,
    providerCustomerId: string
  ): Promise<boolean> {
    const stripe = getStripe();
    try {
      await stripe.paymentMethods.attach(providerMethodId, {
        customer: providerCustomerId,
      });
      return true;
    } catch {
      return false;
    }
  }

  /** List all payment methods for a customer (for payment method management UI) */
  async listPaymentMethods(
    providerCustomerId: string
  ): Promise<StripePaymentMethodData[]> {
    const stripe = getStripe();
    try {
      const methods = await stripe.paymentMethods.list({
        customer: providerCustomerId,
        type: "card",
        limit: 20,
      });
      return methods.data
        .filter((pm) => pm.type === "card" && pm.card)
        .map((pm) => ({
          id: pm.id,
          type: "card",
          last4: pm.card!.last4,
          brand: pm.card!.brand,
          expiryMonth: pm.card!.exp_month,
          expiryYear: pm.card!.exp_year,
          isDefault: false,
        }));
    } catch {
      return [];
    }
  }

  /** Detach a payment method from a customer */
  async detachPaymentMethod(paymentMethodId: string): Promise<boolean> {
    const stripe = getStripe();
    try {
      await stripe.paymentMethods.detach(paymentMethodId);
      return true;
    } catch {
      return false;
    }
  }

  /** Create a SetupIntent for adding a new payment method */
  async createSetupIntent(providerCustomerId: string): Promise<string | null> {
    const stripe = getStripe();
    try {
      const intent = await stripe.setupIntents.create({
        customer: providerCustomerId,
        payment_method_types: ["card"],
      });
      return intent.client_secret ?? null;
    } catch {
      return null;
    }
  }

  /** Verify a Stripe webhook signature and return the event */
  verifyWebhookSignature(payload: string, signature: string): Stripe.Event | null {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
    const stripe = getStripe();
    try {
      return stripe.webhooks.constructEvent(payload, signature, secret);
    } catch {
      return null;
    }
  }
}

export interface StripePaymentMethodData {
  id: string;
  type: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

export const stripeBillingAdapter = new StripeBillingAdapter();
