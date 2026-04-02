/**
 * Billing seed — Phase 6 Billing Deep Dive.
 * Seeds plan catalog, tenant subscription, and sample invoices.
 * Idempotent: uses upsert by unique fields where available.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedBilling() {
  console.log("\n💳 Seeding billing...");

  // ── Plans ──────────────────────────────────────────────────────────────────

  const starter = await prisma.plan.upsert({
    where: { code: "starter" },
    update: {},
    create: {
      code: "starter",
      name: "Starter",
      description: "Perfect for single-store food businesses just getting started.",
      status: "ACTIVE",
      billingInterval: "MONTHLY",
      priceAmountMinor: 4900,
      currencyCode: "NZD",
      trialDays: 14,
      isDefault: true,
      sortOrder: 1,
    },
  });

  const growth = await prisma.plan.upsert({
    where: { code: "growth" },
    update: {},
    create: {
      code: "growth",
      name: "Growth",
      description: "For growing businesses managing multiple stores and channels.",
      status: "ACTIVE",
      billingInterval: "MONTHLY",
      priceAmountMinor: 14900,
      currencyCode: "NZD",
      trialDays: 14,
      isDefault: false,
      sortOrder: 2,
    },
  });

  const scale = await prisma.plan.upsert({
    where: { code: "scale" },
    update: {},
    create: {
      code: "scale",
      name: "Scale",
      description: "Enterprise-grade for high-volume multi-location operations.",
      status: "ACTIVE",
      billingInterval: "MONTHLY",
      priceAmountMinor: 39900,
      currencyCode: "NZD",
      trialDays: 14,
      isDefault: false,
      sortOrder: 3,
    },
  });

  console.log("  ✓ Plans: Starter, Growth, Scale");

  // ── Plan Limits ────────────────────────────────────────────────────────────

  const planLimits: Array<{
    planId: string;
    key: string;
    valueInt?: number | null;
    unit?: string | null;
  }> = [
    // Starter
    { planId: starter.id, key: "stores.max", valueInt: 1, unit: "stores" },
    { planId: starter.id, key: "staff.max", valueInt: 5, unit: "users" },
    { planId: starter.id, key: "channels.max", valueInt: 2, unit: "channels" },
    { planId: starter.id, key: "orders.monthly", valueInt: 500, unit: "orders" },
    { planId: starter.id, key: "subscriptions.monthly", valueInt: 50, unit: "subscriptions" },
    // Growth
    { planId: growth.id, key: "stores.max", valueInt: 5, unit: "stores" },
    { planId: growth.id, key: "staff.max", valueInt: 20, unit: "users" },
    { planId: growth.id, key: "channels.max", valueInt: 10, unit: "channels" },
    { planId: growth.id, key: "orders.monthly", valueInt: 5000, unit: "orders" },
    { planId: growth.id, key: "subscriptions.monthly", valueInt: 500, unit: "subscriptions" },
    // Scale — null means unlimited
    { planId: scale.id, key: "stores.max", valueInt: null, unit: "stores" },
    { planId: scale.id, key: "staff.max", valueInt: null, unit: "users" },
    { planId: scale.id, key: "channels.max", valueInt: null, unit: "channels" },
    { planId: scale.id, key: "orders.monthly", valueInt: null, unit: "orders" },
    { planId: scale.id, key: "subscriptions.monthly", valueInt: null, unit: "subscriptions" },
  ];

  for (const limit of planLimits) {
    await prisma.planLimit.upsert({
      where: { planId_key: { planId: limit.planId, key: limit.key } },
      update: {},
      create: {
        planId: limit.planId,
        key: limit.key,
        valueInt: limit.valueInt ?? null,
        unit: limit.unit ?? null,
      },
    });
  }

  console.log("  ✓ Plan limits seeded");

  // ── Plan Features ──────────────────────────────────────────────────────────

  const planFeatures: Array<{ planId: string; key: string; enabled: boolean }> = [
    { planId: starter.id, key: "analytics.advanced", enabled: false },
    { planId: starter.id, key: "automation.basic", enabled: false },
    { planId: starter.id, key: "priority_support", enabled: false },
    { planId: starter.id, key: "custom_branding", enabled: false },
    { planId: starter.id, key: "multi_store", enabled: false },
    { planId: starter.id, key: "delivery_integrations", enabled: false },
    { planId: growth.id, key: "analytics.advanced", enabled: true },
    { planId: growth.id, key: "automation.basic", enabled: true },
    { planId: growth.id, key: "priority_support", enabled: false },
    { planId: growth.id, key: "custom_branding", enabled: true },
    { planId: growth.id, key: "multi_store", enabled: true },
    { planId: growth.id, key: "delivery_integrations", enabled: true },
    { planId: scale.id, key: "analytics.advanced", enabled: true },
    { planId: scale.id, key: "automation.basic", enabled: true },
    { planId: scale.id, key: "priority_support", enabled: true },
    { planId: scale.id, key: "custom_branding", enabled: true },
    { planId: scale.id, key: "multi_store", enabled: true },
    { planId: scale.id, key: "delivery_integrations", enabled: true },
  ];

  for (const feat of planFeatures) {
    await prisma.planFeature.upsert({
      where: { planId_key: { planId: feat.planId, key: feat.key } },
      update: {},
      create: { planId: feat.planId, key: feat.key, enabled: feat.enabled },
    });
  }

  console.log("  ✓ Plan features seeded");

  // ── Demo Tenant Subscription ───────────────────────────────────────────────

  const tenant = await prisma.tenant.findUnique({ where: { slug: "bagels-beyond" } });
  if (!tenant) {
    console.log("  ⚠ Demo tenant not found, skipping subscription/invoice seed");
    return;
  }

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const nextBillingAt = new Date(periodEnd);
  nextBillingAt.setDate(nextBillingAt.getDate() + 1);

  let subscription = await prisma.tenantSubscription.findFirst({
    where: { tenantId: tenant.id, status: { in: ["ACTIVE", "TRIAL", "PAST_DUE"] } },
  });

  if (!subscription) {
    subscription = await prisma.tenantSubscription.create({
      data: {
        tenantId: tenant.id,
        planId: growth.id,
        status: "ACTIVE",
        billingInterval: "MONTHLY",
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        nextBillingAt,
        startedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      },
    });
    console.log("  ✓ Tenant subscription created (Growth, ACTIVE)");
  } else {
    console.log("  ✓ Tenant subscription already exists");
  }

  // ── Sample Invoices ────────────────────────────────────────────────────────

  const invoiceExists = await prisma.billingInvoice.findFirst({
    where: { tenantId: tenant.id },
  });

  if (!invoiceExists) {
    const inv1BilledAt = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const inv1PeriodStart = new Date(inv1BilledAt.getFullYear(), inv1BilledAt.getMonth(), 1);
    const inv1PeriodEnd = new Date(inv1BilledAt.getFullYear(), inv1BilledAt.getMonth() + 1, 0);

    const inv2BilledAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const inv2PeriodStart = new Date(inv2BilledAt.getFullYear(), inv2BilledAt.getMonth(), 1);
    const inv2PeriodEnd = new Date(inv2BilledAt.getFullYear(), inv2BilledAt.getMonth() + 1, 0);

    const inv3DueAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    // Invoice 1: PAID (2 months ago)
    const invoice1 = await prisma.billingInvoice.create({
      data: {
        tenantId: tenant.id,
        subscriptionId: subscription.id,
        invoiceNumber: "INV-0001",
        status: "PAID",
        currency: "NZD",
        subtotalMinor: 14900,
        taxMinor: 2235,
        totalMinor: 17135,
        amountPaidMinor: 17135,
        amountDueMinor: 0,
        billedAt: inv1BilledAt,
        dueAt: new Date(inv1BilledAt.getTime() + 7 * 24 * 60 * 60 * 1000),
        paidAt: new Date(inv1BilledAt.getTime() + 2 * 24 * 60 * 60 * 1000),
        billingPeriodStart: inv1PeriodStart,
        billingPeriodEnd: inv1PeriodEnd,
      },
    });

    await prisma.billingInvoiceLine.createMany({
      data: [
        {
          invoiceId: invoice1.id,
          type: "PLAN",
          description: "Growth Plan — Monthly",
          quantity: 1,
          unitAmountMinor: 14900,
          amountMinor: 14900,
        },
        {
          invoiceId: invoice1.id,
          type: "TAX",
          description: "GST (15%)",
          quantity: null,
          unitAmountMinor: null,
          amountMinor: 2235,
        },
      ],
    });

    // Invoice 2: OPEN (last month, not yet paid)
    const invoice2 = await prisma.billingInvoice.create({
      data: {
        tenantId: tenant.id,
        subscriptionId: subscription.id,
        invoiceNumber: "INV-0002",
        status: "OPEN",
        currency: "NZD",
        subtotalMinor: 14900,
        taxMinor: 2235,
        totalMinor: 17135,
        amountPaidMinor: 0,
        amountDueMinor: 17135,
        billedAt: inv2BilledAt,
        dueAt: new Date(inv2BilledAt.getTime() + 14 * 24 * 60 * 60 * 1000),
        paidAt: null,
        billingPeriodStart: inv2PeriodStart,
        billingPeriodEnd: inv2PeriodEnd,
      },
    });

    await prisma.billingInvoiceLine.create({
      data: {
        invoiceId: invoice2.id,
        type: "PLAN",
        description: "Growth Plan — Monthly",
        quantity: 1,
        unitAmountMinor: 14900,
        amountMinor: 14900,
      },
    });

    // Invoice 3: PAST_DUE (overdue)
    const invoice3 = await prisma.billingInvoice.create({
      data: {
        tenantId: tenant.id,
        subscriptionId: subscription.id,
        invoiceNumber: "INV-0003",
        status: "PAST_DUE",
        currency: "NZD",
        subtotalMinor: 14900,
        taxMinor: 2235,
        totalMinor: 17135,
        amountPaidMinor: 0,
        amountDueMinor: 17135,
        billedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        dueAt: inv3DueAt,
        paidAt: null,
        billingPeriodStart: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
        billingPeriodEnd: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.billingInvoiceLine.create({
      data: {
        invoiceId: invoice3.id,
        type: "PLAN",
        description: "Growth Plan — Monthly",
        quantity: 1,
        unitAmountMinor: 14900,
        amountMinor: 14900,
      },
    });

    // Failed payment attempt for PAST_DUE invoice
    await prisma.paymentAttempt.create({
      data: {
        tenantId: tenant.id,
        invoiceId: invoice3.id,
        status: "FAILED",
        attemptedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        failureCode: "card_declined",
        failureMessage: "Your card was declined. Please update your payment method.",
        retryable: true,
      },
    });

    // Invoice 4: FAILED
    const invoice4 = await prisma.billingInvoice.create({
      data: {
        tenantId: tenant.id,
        subscriptionId: subscription.id,
        invoiceNumber: "INV-0004",
        status: "FAILED",
        currency: "NZD",
        subtotalMinor: 14900,
        taxMinor: 2235,
        totalMinor: 17135,
        amountPaidMinor: 0,
        amountDueMinor: 17135,
        billedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        dueAt: new Date(Date.now() - 38 * 24 * 60 * 60 * 1000),
        paidAt: null,
        billingPeriodStart: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000),
        billingPeriodEnd: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.billingInvoiceLine.create({
      data: {
        invoiceId: invoice4.id,
        type: "PLAN",
        description: "Growth Plan — Monthly",
        quantity: 1,
        unitAmountMinor: 14900,
        amountMinor: 14900,
      },
    });

    console.log("  ✓ Sample invoices created (PAID, OPEN, PAST_DUE, FAILED)");
  } else {
    console.log("  ✓ Sample invoices already exist");
  }

  // ── Usage Metric Snapshots ─────────────────────────────────────────────────

  const snapshotExists = await prisma.usageMetricSnapshot.findFirst({
    where: { tenantId: tenant.id },
  });

  if (!snapshotExists) {
    const metrics: Array<{
      metricKey: string;
      currentValue: number;
      limitValue: number;
      utilizationPercent: number;
      status: "NORMAL" | "NEAR_LIMIT" | "REACHED" | "EXCEEDED";
    }> = [
      { metricKey: "stores.max", currentValue: 1, limitValue: 5, utilizationPercent: 20, status: "NORMAL" },
      { metricKey: "staff.max", currentValue: 3, limitValue: 20, utilizationPercent: 15, status: "NORMAL" },
      { metricKey: "channels.max", currentValue: 2, limitValue: 10, utilizationPercent: 20, status: "NORMAL" },
      { metricKey: "orders.monthly", currentValue: 4200, limitValue: 5000, utilizationPercent: 84, status: "NEAR_LIMIT" },
      { metricKey: "subscriptions.monthly", currentValue: 380, limitValue: 500, utilizationPercent: 76, status: "NORMAL" },
    ];

    await prisma.usageMetricSnapshot.createMany({
      data: metrics.map((m) => ({
        tenantId: tenant.id,
        subscriptionId: subscription.id,
        metricKey: m.metricKey,
        currentValue: m.currentValue,
        limitValue: m.limitValue,
        utilizationPercent: m.utilizationPercent,
        status: m.status,
        periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
        periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        measuredAt: now,
      })),
    });

    console.log("  ✓ Usage metric snapshots seeded");
  } else {
    console.log("  ✓ Usage metric snapshots already exist");
  }

  console.log("  ✓ Billing seed complete");
}
