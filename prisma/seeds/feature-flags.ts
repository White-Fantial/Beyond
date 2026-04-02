import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultFlags = [
  {
    key: "catalog_sync_v2",
    name: "Catalog Sync V2",
    description:
      "Next-gen Catalog Sync engine. Uses new processing pipeline instead of legacy sync path.",
    flagType: "BOOLEAN" as const,
    defaultBoolValue: false,
  },
  {
    key: "new_order_forwarding_ui",
    name: "New Order Forwarding UI",
    description: "새 주문 전달 UI. 기존 레거시 order forwarding 화면 대신 사용.",
    flagType: "BOOLEAN" as const,
    defaultBoolValue: false,
  },
  {
    key: "advanced_analytics",
    name: "Advanced Analytics",
    description: "고급 분석 Dashboard. Store/Tenant 단위로 켤 수 있는 고급 통계 뷰.",
    flagType: "BOOLEAN" as const,
    defaultBoolValue: false,
  },
  {
    key: "billing_portal_enabled",
    name: "Billing Portal",
    description: "Tenant별 셀프서브 빌링 포털 접근 Active화.",
    flagType: "BOOLEAN" as const,
    defaultBoolValue: true,
  },
  {
    key: "integrations_provider_rollout",
    name: "Integrations Provider Rollout",
    description: "새 provider 연동 점진 배포 플래그. provider scope로 켜짐.",
    flagType: "BOOLEAN" as const,
    defaultBoolValue: false,
  },
  {
    key: "subscription_portal_enabled",
    name: "Subscription Portal",
    description: "Subscription Management 포털 UI Active화.",
    flagType: "BOOLEAN" as const,
    defaultBoolValue: false,
  },
  {
    key: "admin_experimental_page",
    name: "Admin Experimental Page",
    description: "실험적 어드민 페이지 노출 플래그.",
    flagType: "BOOLEAN" as const,
    defaultBoolValue: false,
  },
];

export async function seedFeatureFlags() {
  for (const flag of defaultFlags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {},
      create: flag,
    });
  }
  console.log(`[seed] Feature flags seeded (${defaultFlags.length} flags).`);
}

// Allow running standalone: ts-node prisma/seeds/feature-flags.ts
if (require.main === module) {
  seedFeatureFlags()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
