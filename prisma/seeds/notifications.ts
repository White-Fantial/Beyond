/**
 * Notifications seed — Phase 8 Automation & Notifications.
 * Seeds sample alert rules and notifications for the default tenant.
 * Idempotent: skips if records already exist.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SAMPLE_ALERT_RULES = [
  {
    metricType: "CANCELLATION_RATE" as const,
    threshold: 20,
    windowMinutes: 60,
    enabled: true,
  },
  {
    metricType: "REVENUE_DROP" as const,
    threshold: -30,
    windowMinutes: 120,
    enabled: true,
  },
  {
    metricType: "SOLD_OUT_COUNT" as const,
    threshold: 5,
    windowMinutes: 60,
    enabled: false,
  },
  {
    metricType: "POS_DISCONNECT" as const,
    threshold: 0,
    windowMinutes: 60,
    enabled: true,
  },
];

export async function seedNotifications() {
  console.log("\n🔔 Seeding alert rules and notifications...");

  const tenant = await prisma.tenant.findFirst({
    where: { slug: "bagels-beyond" },
    select: { id: true },
  });
  if (!tenant) {
    console.log("  ⚠  Tenant 'bagels-beyond' not found — skipping notification seed.");
    return;
  }

  const owner = await prisma.user.findFirst({
    where: { email: "owner@bagelsbeyond.local" },
    select: { id: true },
  });

  const existingCount = await prisma.alertRule.count({
    where: { tenantId: tenant.id },
  });

  if (existingCount === 0) {
    for (const rule of SAMPLE_ALERT_RULES) {
      await prisma.alertRule.create({
        data: {
          tenantId: tenant.id,
          metricType: rule.metricType,
          threshold: rule.threshold,
          windowMinutes: rule.windowMinutes,
          enabled: rule.enabled,
          createdBy: owner?.id ?? null,
        },
      });
    }
    console.log(`  ✓ Alert rules seeded (${SAMPLE_ALERT_RULES.length} rules).`);
  } else {
    console.log(`  — Alert rules already present (${existingCount} rules), skipping.`);
  }

  if (!owner) {
    console.log("  ⚠  Owner user not found — skipping sample notifications.");
    return;
  }

  const existingNotifCount = await prisma.notification.count({
    where: { tenantId: tenant.id, userId: owner.id },
  });

  if (existingNotifCount === 0) {
    const samples = [
      {
        type: "ALERT_TRIGGERED" as const,
        title: "High cancellation rate: 23.5%",
        body: "All stores — Cancellation rate of 23.5% exceeds the configured threshold of 20%.",
        entityType: "AlertRule",
        readAt: null,
      },
      {
        type: "BILLING_REMINDER" as const,
        title: "Subscription renewal in 7 days",
        body: "Your Growth plan renews on 10 April 2026. Ensure your payment method is up to date.",
        entityType: "TenantSubscription",
        readAt: new Date("2026-04-01T09:00:00Z"),
      },
      {
        type: "INTEGRATION_ISSUE" as const,
        title: "POS connection issue detected",
        body: "All stores — One or more POS connections are in a disconnected or error state.",
        entityType: "AlertRule",
        readAt: null,
      },
    ];

    for (const n of samples) {
      await prisma.notification.create({
        data: {
          tenantId: tenant.id,
          userId: owner.id,
          type: n.type,
          title: n.title,
          body: n.body,
          entityType: n.entityType,
          entityId: null,
          readAt: n.readAt,
        },
      });
    }
    console.log(`  ✓ Sample notifications seeded (${samples.length}).`);
  } else {
    console.log(`  — Notifications already present (${existingNotifCount}), skipping.`);
  }
}

// Allow running standalone
if (require.main === module) {
  seedNotifications()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
