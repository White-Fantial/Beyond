import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ROLES = [
  { key: "CUSTOMER", name: "Customer", description: "Customer ordering and subscription user" },
  { key: "STAFF", name: "Staff", description: "Handles orders and basic inventory" },
  { key: "SUPERVISOR", name: "Supervisor", description: "Operational supervisor with broader daily controls" },
  { key: "MANAGER", name: "Manager", description: "Store manager with full operational management" },
  { key: "OWNER", name: "Owner", description: "Business owner managing team, billing, integrations" },
  { key: "ADMIN", name: "Admin", description: "Platform administrator" },
];

const PERMISSIONS = [
  { key: "CUSTOMER_APP", name: "Customer App", description: "Access to customer ordering app" },
  { key: "ORDERS", name: "Orders", description: "View and manage orders" },
  { key: "OPERATIONS", name: "Operations", description: "Manage daily operations" },
  { key: "INVENTORY", name: "Inventory", description: "Manage inventory and sold-out status" },
  { key: "MENU_VIEW", name: "Menu View", description: "View menu data (read-only)" },
  { key: "MENU_MANAGE", name: "Menu Manage", description: "Create and edit menu items" },
  { key: "CATEGORY_MANAGE", name: "Category Manage", description: "Manage categories and visibility" },
  { key: "MODIFIER_MANAGE", name: "Modifier Manage", description: "Manage option groups and modifiers" },
  { key: "REPORTS", name: "Reports", description: "View reports and analytics" },
  { key: "STAFF_MANAGE", name: "Staff Manage", description: "Manage store team members" },
  { key: "STORE_SETTINGS", name: "Store Settings", description: "Manage store configuration" },
  { key: "INTEGRATIONS", name: "Integrations", description: "Manage POS and delivery integrations" },
  { key: "BILLING", name: "Billing", description: "Manage billing and subscriptions" },
  { key: "PLATFORM_ADMIN", name: "Platform Admin", description: "Platform-level administration" },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  CUSTOMER: ["CUSTOMER_APP"],
  STAFF: ["ORDERS", "OPERATIONS", "INVENTORY", "MENU_VIEW"],
  SUPERVISOR: ["ORDERS", "OPERATIONS", "INVENTORY", "MENU_VIEW", "REPORTS", "CATEGORY_MANAGE"],
  MANAGER: [
    "ORDERS", "OPERATIONS", "INVENTORY", "MENU_VIEW", "MENU_MANAGE",
    "CATEGORY_MANAGE", "MODIFIER_MANAGE", "REPORTS",
  ],
  OWNER: [
    "ORDERS", "OPERATIONS", "INVENTORY", "MENU_VIEW", "MENU_MANAGE",
    "CATEGORY_MANAGE", "MODIFIER_MANAGE", "REPORTS",
    "STAFF_MANAGE", "STORE_SETTINGS", "INTEGRATIONS", "BILLING",
  ],
  ADMIN: ["PLATFORM_ADMIN"],
};

async function main() {
  console.log("🌱 Starting seed...\n");

  // Upsert roles
  console.log("📋 Seeding roles...");
  const roleMap: Record<string, string> = {};
  for (const role of ROLES) {
    const r = await prisma.role.upsert({
      where: { key: role.key },
      update: { name: role.name, description: role.description },
      create: role,
    });
    roleMap[role.key] = r.id;
    console.log(`  ✓ Role: ${role.key}`);
  }

  // Upsert permissions
  console.log("\n🔑 Seeding permissions...");
  const permMap: Record<string, string> = {};
  for (const perm of PERMISSIONS) {
    const p = await prisma.permission.upsert({
      where: { key: perm.key },
      update: { name: perm.name, description: perm.description },
      create: perm,
    });
    permMap[perm.key] = p.id;
    console.log(`  ✓ Permission: ${perm.key}`);
  }

  // Upsert role-permission mappings
  console.log("\n🔗 Seeding role-permission mappings...");
  for (const [roleKey, permKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleMap[roleKey];
    for (const permKey of permKeys) {
      const permissionId = permMap[permKey];
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
    }
    console.log(`  ✓ ${roleKey} -> [${permKeys.join(", ")}]`);
  }

  // Seed demo tenant
  console.log("\n🏢 Seeding demo tenant...");
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: { name: "Demo Food Co.", slug: "demo", plan: "PRO", status: "ACTIVE" },
  });
  console.log(`  ✓ Tenant: ${tenant.name} (${tenant.slug})`);

  // Seed demo store
  console.log("\n🏪 Seeding demo store...");
  const store = await prisma.store.upsert({
    where: { id: "store-demo-001" },
    update: {},
    create: {
      id: "store-demo-001",
      tenantId: tenant.id,
      name: "Demo Store",
      address: "123 Main St",
      status: "ACTIVE",
    },
  });
  console.log(`  ✓ Store: ${store.name} (${store.id})`);

  // Seed demo users
  console.log("\n👤 Seeding demo users...");
  const demoUsers = [
    { email: "customer@demo.com", name: "Demo Customer", platformRole: "CUSTOMER" },
    { email: "staff@demo.com", name: "Demo Staff", platformRole: "STAFF" },
    { email: "supervisor@demo.com", name: "Demo Supervisor", platformRole: "SUPERVISOR" },
    { email: "manager@demo.com", name: "Demo Manager", platformRole: "MANAGER" },
    { email: "owner@demo.com", name: "Demo Owner", platformRole: "OWNER" },
    { email: "admin@demo.com", name: "Demo Admin", platformRole: "ADMIN" },
  ];

  const password = await bcrypt.hash("password123", 10);
  const userMap: Record<string, string> = {};

  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { platformRole: u.platformRole },
      create: {
        email: u.email,
        name: u.name,
        password,
        platformRole: u.platformRole,
        tenantId: u.platformRole !== "ADMIN" ? tenant.id : null,
      },
    });
    userMap[u.platformRole] = user.id;
    console.log(`  ✓ User: ${u.email} (${u.platformRole})`);
  }

  // Seed store memberships for operational users
  console.log("\n🔗 Seeding store memberships...");
  const operationalRoles = ["STAFF", "SUPERVISOR", "MANAGER"];
  for (const roleKey of operationalRoles) {
    const userId = userMap[roleKey];
    const roleId = roleMap[roleKey];
    if (!userId || !roleId) continue;
    await prisma.storeMembership.upsert({
      where: { userId_storeId: { userId, storeId: store.id } },
      update: { roleId, isDefault: true },
      create: { userId, storeId: store.id, roleId, isDefault: true, isActive: true },
    });
    // Set default store
    await prisma.user.update({
      where: { id: userId },
      data: { defaultStoreId: store.id },
    });
    console.log(`  ✓ Membership: ${roleKey} -> ${store.name}`);
  }

  // Owner gets store membership too
  const ownerId = userMap["OWNER"];
  if (ownerId) {
    await prisma.storeMembership.upsert({
      where: { userId_storeId: { userId: ownerId, storeId: store.id } },
      update: { roleId: roleMap["OWNER"], isDefault: true },
      create: { userId: ownerId, storeId: store.id, roleId: roleMap["OWNER"], isDefault: true, isActive: true },
    });
    await prisma.user.update({
      where: { id: ownerId },
      data: { defaultStoreId: store.id },
    });
    console.log(`  ✓ Membership: OWNER -> ${store.name}`);
  }

  console.log("\n✅ Seed complete!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Demo users (password: password123):");
  console.log("  customer@demo.com  -> /app");
  console.log("  staff@demo.com     -> /backoffice/store/[storeId]/orders");
  console.log("  supervisor@demo.com-> /backoffice/store/[storeId]/operations");
  console.log("  manager@demo.com   -> /backoffice/store/[storeId]/dashboard");
  console.log("  owner@demo.com     -> /owner");
  console.log("  admin@demo.com     -> /admin");
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
