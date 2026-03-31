import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...\n");

  // ── Tenant ──────────────────────────────────────────────────────────────
  console.log("🏢 Seeding tenant...");
  const tenant = await prisma.tenant.upsert({
    where: { slug: "bagels-beyond" },
    update: {},
    create: {
      slug: "bagels-beyond",
      legalName: "Bagels Beyond Ltd",
      displayName: "Bagels Beyond",
      status: "ACTIVE",
      timezone: "Pacific/Auckland",
      currency: "NZD",
      countryCode: "NZ",
    },
  });
  console.log(`  ✓ Tenant: ${tenant.displayName} (${tenant.slug})`);

  // ── Platform Admin ─────────────────────────────────────────────────────
  console.log("👑 Seeding platform admin...");
  const adminPasswordHash = await bcrypt.hash("Bchfhd$16", 10);
  const adminUser = await prisma.user.upsert({
    where: { email: "nomadongho@gmail.com" },
    update: { passwordHash: adminPasswordHash },
    create: {
      email: "nomadongho@gmail.com",
      name: "Dongho Park",
      passwordHash: adminPasswordHash,
      platformRole: "PLATFORM_ADMIN",
      status: "ACTIVE",
    },
  });
  console.log(`  ✓ Platform Admin: ${adminUser.email}`);

  // ── Owner User ─────────────────────────────────────────────────────────
  console.log("\n👤 Seeding owner user...");
  const passwordHash = await bcrypt.hash("password123", 10);
  const ownerUser = await prisma.user.upsert({
    where: { email: "owner@bagelsbeyond.local" },
    update: {},
    create: {
      email: "owner@bagelsbeyond.local",
      name: "Owner",
      passwordHash,
      platformRole: "USER",
      status: "ACTIVE",
    },
  });
  console.log(`  ✓ User: ${ownerUser.email}`);

  // ── Membership ─────────────────────────────────────────────────────────
  console.log("\n🔗 Seeding membership...");
  const membership = await prisma.membership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: ownerUser.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: ownerUser.id,
      role: "OWNER",
      status: "ACTIVE",
      joinedAt: new Date(),
    },
  });
  console.log(`  ✓ Membership: OWNER in ${tenant.displayName}`);

  // ── Store ──────────────────────────────────────────────────────────────
  console.log("\n🏪 Seeding store...");
  const store = await prisma.store.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "addington" } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: "addington",
      name: "Addington Store",
      displayName: "Addington",
      status: "ACTIVE",
      timezone: "Pacific/Auckland",
      currency: "NZD",
      countryCode: "NZ",
    },
  });
  console.log(`  ✓ Store: ${store.displayName} (${store.code})`);

  // ── StoreMembership ────────────────────────────────────────────────────
  console.log("\n🔗 Seeding store membership...");
  await prisma.storeMembership.upsert({
    where: { membershipId_storeId: { membershipId: membership.id, storeId: store.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      membershipId: membership.id,
      storeId: store.id,
      role: "OWNER",
      status: "ACTIVE",
    },
  });
  console.log(`  ✓ StoreMembership: OWNER at ${store.displayName}`);

  console.log("\n✅ Seed complete!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Bagels Beyond seed data:");
  console.log(`  Tenant:       ${tenant.displayName} (${tenant.slug})`);
  console.log(`  Store:        ${store.displayName} (${store.code})`);
  console.log(`  User:         owner@bagelsbeyond.local  (password: password123)`);
  console.log(`  Platform Admin: nomadongho@gmail.com`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
