/**
 * Billing provider adapter interface.
 * Keeps the application layer decoupled from any specific billing provider (Stripe, etc).
 * All billing service code talks to this interface, not to provider SDKs directly.
 */

export interface ProviderSubscriptionData {
  providerSubscriptionId: string;
  status: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export interface ProviderInvoiceData {
  providerInvoiceId: string;
  invoiceNumber: string | null;
  status: string;
  currency: string;
  totalMinor: number;
  amountDueMinor: number;
  amountPaidMinor: number;
  billedAt: Date | null;
  dueAt: Date | null;
  paidAt: Date | null;
  hostedInvoiceUrl: string | null;
  pdfUrl: string | null;
}

export interface ProviderPlanChangePreview {
  prorationMinor: number | null;
  effectiveAt: Date | null;
  previewLines: Array<{ description: string; amountMinor: number }>;
}

export interface ProviderPaymentMethodSummary {
  type: string;
  last4: string | null;
  brand: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
}

export interface BillingProviderAdapter {
  /** Fetch current subscription state from provider */
  getSubscription(providerSubscriptionId: string): Promise<ProviderSubscriptionData | null>;

  /** List invoices for a provider customer */
  listInvoices(providerCustomerId: string): Promise<ProviderInvoiceData[]>;

  /** Preview what a plan change would cost/credit */
  previewPlanChange(
    providerSubscriptionId: string,
    targetProviderPriceId: string
  ): Promise<ProviderPlanChangePreview | null>;

  /** Apply a plan change on the provider side */
  applyPlanChange(
    providerSubscriptionId: string,
    targetProviderPriceId: string,
    immediate: boolean
  ): Promise<boolean>;

  /** Retry a failed invoice payment */
  retryInvoicePayment(providerInvoiceId: string): Promise<boolean>;

  /** Get payment method summary for a provider customer */
  getPaymentMethodSummary(
    providerCustomerId: string
  ): Promise<ProviderPaymentMethodSummary | null>;
}
