/**
 * Mock billing provider adapter for local dev and testing.
 * Returns deterministic data that simulates a real billing provider.
 * TODO: Replace with StripeBillingAdapter when Stripe integration is added.
 */
import type {
  BillingProviderAdapter,
  ProviderSubscriptionData,
  ProviderInvoiceData,
  ProviderPlanChangePreview,
  ProviderPaymentMethodSummary,
} from "./billing-provider.adapter";

export class MockBillingProviderAdapter implements BillingProviderAdapter {
  async getSubscription(providerSubscriptionId: string): Promise<ProviderSubscriptionData | null> {
    if (!providerSubscriptionId) return null;
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 15);
    return {
      providerSubscriptionId,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    };
  }

  async listInvoices(_providerCustomerId: string): Promise<ProviderInvoiceData[]> {
    // Mock adapter intentionally returns an empty list.
    // In production, invoice data is stored in internal BillingInvoice records
    // and synced from the provider via webhook events rather than on-demand fetching.
    return [];
  }

  async previewPlanChange(
    _providerSubscriptionId: string,
    _targetProviderPriceId: string
  ): Promise<ProviderPlanChangePreview | null> {
    // TODO: implement when Stripe adapter is added
    return {
      prorationMinor: null,
      effectiveAt: null,
      previewLines: [],
    };
  }

  async applyPlanChange(
    _providerSubscriptionId: string,
    _targetProviderPriceId: string,
    _immediate: boolean
  ): Promise<boolean> {
    // TODO: implement when Stripe adapter is added
    return true;
  }

  async retryInvoicePayment(_providerInvoiceId: string): Promise<boolean> {
    // TODO: implement when Stripe adapter is added
    return true;
  }

  async getPaymentMethodSummary(
    _providerCustomerId: string
  ): Promise<ProviderPaymentMethodSummary | null> {
    // TODO: implement when Stripe adapter is added
    return null;
  }
}

export const mockBillingAdapter = new MockBillingProviderAdapter();
