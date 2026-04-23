/**
 * Stripe Connect utilities — provider onboarding & payouts.
 *
 * All functions in this module are thin wrappers around the Stripe SDK so that
 * tests can swap the adapter with setStripeConnectAdapter().
 */
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

// ─── Platform fee ─────────────────────────────────────────────────────────────

/** Platform fee percentage charged on each recipe purchase (10%). */
export const PLATFORM_FEE_PERCENT = 10;

// ─── Adapter (test-injectable) ────────────────────────────────────────────────

export interface StripeConnectAdapter {
  createExpressAccount(email: string, locale?: string): Promise<{ id: string }>;
  createAccountLink(
    accountId: string,
    returnUrl: string,
    refreshUrl: string
  ): Promise<{ url: string }>;
  retrieveAccount(accountId: string): Promise<{
    payouts_enabled: boolean;
    details_submitted: boolean;
  }>;
  createTransfer(params: {
    amount: number;
    currency: string;
    destination: string;
    transferGroup?: string;
    metadata?: Record<string, string>;
  }): Promise<{ id: string }>;
  createPaymentIntent(params: {
    amount: number;
    currency: string;
    applicationFeeAmount: number;
    transferData: { destination: string };
    metadata?: Record<string, string>;
  }): Promise<{ id: string; client_secret: string | null }>;
  constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): Stripe.Event;
}

let _adapter: StripeConnectAdapter | null = null;

export function setStripeConnectAdapter(adapter: StripeConnectAdapter | null) {
  _adapter = adapter;
}

function getAdapter(): StripeConnectAdapter {
  if (_adapter) return _adapter;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");

  const stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });

  return {
    async createExpressAccount(email, locale = "ko-KR") {
      const account = await stripe.accounts.create({
        type: "express",
        email,
        capabilities: { transfers: { requested: true } },
        settings: { payouts: { schedule: { interval: "manual" } } },
        business_profile: { mcc: "5734" }, // Computer & Software Stores
        metadata: { locale },
      });
      return { id: account.id };
    },

    async createAccountLink(accountId, returnUrl, refreshUrl) {
      const link = await stripe.accountLinks.create({
        account: accountId,
        type: "account_onboarding",
        return_url: returnUrl,
        refresh_url: refreshUrl,
      });
      return { url: link.url };
    },

    async retrieveAccount(accountId) {
      const account = await stripe.accounts.retrieve(accountId);
      return {
        payouts_enabled: account.payouts_enabled ?? false,
        details_submitted: account.details_submitted ?? false,
      };
    },

    async createTransfer({ amount, currency, destination, transferGroup, metadata }) {
      const transfer = await stripe.transfers.create({
        amount,
        currency,
        destination,
        transfer_group: transferGroup,
        metadata: metadata ?? {},
      });
      return { id: transfer.id };
    },

    async createPaymentIntent({
      amount,
      currency,
      applicationFeeAmount,
      transferData,
      metadata,
    }) {
      const pi = await stripe.paymentIntents.create({
        amount,
        currency,
        application_fee_amount: applicationFeeAmount,
        transfer_data: { destination: transferData.destination },
        metadata: metadata ?? {},
      });
      return { id: pi.id, client_secret: pi.client_secret };
    },

    constructWebhookEvent(payload, signature, secret) {
      return stripe.webhooks.constructEvent(payload, signature, secret);
    },
  };
}

// ─── Public functions ─────────────────────────────────────────────────────────

/**
 * Create a Stripe Express account for the provider and persist the account ID.
 * Idempotent: if the user already has an account ID, returns it without creating a new one.
 */
export async function createConnectAccount(
  userId: string,
  email: string
): Promise<{ accountId: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeConnectAccountId: true },
  });
  if (!user) throw new Error(`User ${userId} not found`);

  if (user.stripeConnectAccountId) {
    return { accountId: user.stripeConnectAccountId };
  }

  const { id: accountId } = await getAdapter().createExpressAccount(email);

  await prisma.user.update({
    where: { id: userId },
    data: { stripeConnectAccountId: accountId },
  });

  return { accountId };
}

/**
 * Generate a Stripe-hosted onboarding URL for the provider.
 * Creates the Express account first if it doesn't exist yet.
 */
export async function createOnboardingLink(
  userId: string,
  email: string,
  returnUrl: string,
  refreshUrl: string
): Promise<{ url: string; accountId: string }> {
  const { accountId } = await createConnectAccount(userId, email);
  const { url } = await getAdapter().createAccountLink(accountId, returnUrl, refreshUrl);
  return { url, accountId };
}

/**
 * Fetch the latest account status from Stripe and update the DB.
 * Returns true if payouts are now enabled.
 */
export async function refreshAccountStatus(
  userId: string
): Promise<{ onboarded: boolean; payoutsEnabled: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeConnectAccountId: true },
  });
  if (!user?.stripeConnectAccountId) {
    return { onboarded: false, payoutsEnabled: false };
  }

  const account = await getAdapter().retrieveAccount(user.stripeConnectAccountId);

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeConnectOnboarded: account.details_submitted,
      stripeConnectPayoutsEnabled: account.payouts_enabled,
    },
  });

  return {
    onboarded: account.details_submitted,
    payoutsEnabled: account.payouts_enabled,
  };
}

/**
 * Transfer the provider's share of a recipe purchase to their Connect account.
 * Returns the Stripe Transfer ID.
 */
export async function createProviderTransfer(params: {
  amount: number;
  currency: string;
  destination: string;
  purchaseId: string;
}): Promise<{ transferId: string }> {
  const { id: transferId } = await getAdapter().createTransfer({
    amount: params.amount,
    currency: params.currency.toLowerCase(),
    destination: params.destination,
    transferGroup: `purchase_${params.purchaseId}`,
    metadata: { purchaseId: params.purchaseId },
  });
  return { transferId };
}

/**
 * Create a Stripe PaymentIntent for a recipe purchase.
 * Uses application_fee_amount so the platform fee stays on the platform account.
 */
export async function createRecipePaymentIntent(params: {
  amount: number;         // total in minor currency units
  currency: string;       // e.g. "USD"
  providerAccountId: string;
  recipeId: string;
  buyerUserId: string;
}): Promise<{ paymentIntentId: string; clientSecret: string }> {
  const feeAmount = Math.round(params.amount * PLATFORM_FEE_PERCENT / 100);

  const pi = await getAdapter().createPaymentIntent({
    amount: params.amount,
    currency: params.currency.toLowerCase(),
    applicationFeeAmount: feeAmount,
    transferData: { destination: params.providerAccountId },
    metadata: {
      recipeId: params.recipeId,
      buyerUserId: params.buyerUserId,
    },
  });

  if (!pi.client_secret) throw new Error("PaymentIntent has no client_secret");

  return {
    paymentIntentId: pi.id,
    clientSecret: pi.client_secret,
  };
}

/**
 * Verify and parse a Stripe webhook event.
 */
export function verifyStripeWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return getAdapter().constructWebhookEvent(payload, signature, secret);
}
