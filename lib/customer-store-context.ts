/**
 * Customer Store Context Resolution
 *
 * Determines which store a customer is interacting with inside the branded
 * customer app at `/[tenantSlug]/app/*`.
 *
 * Resolution order:
 *  1. URL query param `?s=<storeCode>`          → resolved to storeId, saved as preferred
 *  2. `beyond_store_ctx` cookie (storeId)        → validated against tenant
 *  3. Customer's `preferredStoreId` in DB        → validated against tenant
 *  4. Most-recent-order store for this email     → within the tenant
 *  5. Tenant has exactly one customer-facing store → auto-select
 *  6. None resolved                              → caller should redirect to select-store
 */

import { prisma } from "@/lib/prisma";

/** Cookie name that stores the currently selected storeId for the customer app. */
export const CUSTOMER_STORE_COOKIE = "beyond_store_ctx";

/** Maximum cookie age: 90 days */
export const CUSTOMER_STORE_COOKIE_MAX_AGE = 90 * 24 * 60 * 60;

export interface CustomerStoreContext {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  storeId: string;
  storeName: string;
  storeCode: string;
  /** True when the tenant has more than one customer-facing store (show store switcher). */
  isMultiStore: boolean;
}

export interface StoreOption {
  id: string;
  code: string;
  name: string;
  displayName: string;
  city: string | null;
  addressLine1: string | null;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function fetchTenant(slug: string) {
  return prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, slug: true, displayName: true, status: true },
  });
}

async function fetchCustomerFacingStores(tenantId: string): Promise<StoreOption[]> {
  return prisma.store.findMany({
    where: { tenantId, isCustomerFacing: true, status: { not: "ARCHIVED" } },
    select: {
      id: true,
      code: true,
      name: true,
      displayName: true,
      city: true,
      addressLine1: true,
    },
    orderBy: { name: "asc" },
  });
}

async function validateStoreInTenant(storeId: string, tenantId: string): Promise<StoreOption | null> {
  const store = await prisma.store.findFirst({
    where: { id: storeId, tenantId, isCustomerFacing: true, status: { not: "ARCHIVED" } },
    select: { id: true, code: true, name: true, displayName: true, city: true, addressLine1: true },
  });
  return store ?? null;
}

async function findStoreByCode(storeCode: string, tenantId: string): Promise<StoreOption | null> {
  const store = await prisma.store.findFirst({
    where: { tenantId, code: storeCode, isCustomerFacing: true, status: { not: "ARCHIVED" } },
    select: { id: true, code: true, name: true, displayName: true, city: true, addressLine1: true },
  });
  return store ?? null;
}

async function inferStoreFromRecentOrder(
  userEmail: string,
  tenantId: string
): Promise<string | null> {
  const order = await prisma.order.findFirst({
    where: {
      tenantId,
      customerEmail: userEmail,
    },
    select: { storeId: true },
    orderBy: { orderedAt: "desc" },
  });
  return order?.storeId ?? null;
}

async function inferStoreFromPreferred(
  userEmail: string,
  tenantId: string
): Promise<string | null> {
  const customer = await prisma.customer.findFirst({
    where: { tenantId, email: userEmail, preferredStoreId: { not: null } },
    select: { preferredStoreId: true },
  });
  return customer?.preferredStoreId ?? null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface ResolveStoreContextOptions {
  /** Value from `?s=<code>` query param. */
  storeCode?: string | null;
  /** Value from the `beyond_store_ctx` cookie (a storeId). */
  cookieStoreId?: string | null;
  /** Authenticated user's email — used for order-history and preferred-store lookups. */
  userEmail?: string | null;
}

/**
 * Resolves which store should be active for the current session.
 * Returns `null` when store selection is required from the user.
 */
export async function resolveCustomerStoreContext(
  tenantSlug: string,
  options: ResolveStoreContextOptions = {}
): Promise<CustomerStoreContext | null> {
  const { storeCode, cookieStoreId, userEmail } = options;

  const tenant = await fetchTenant(tenantSlug);
  if (!tenant || tenant.status === "ARCHIVED" || tenant.status === "SUSPENDED") return null;

  const allStores = await fetchCustomerFacingStores(tenant.id);
  const isMultiStore = allStores.length > 1;

  if (allStores.length === 0) return null;

  let resolvedStore: StoreOption | null = null;

  // 1. storeCode from URL param
  if (storeCode) {
    resolvedStore = await findStoreByCode(storeCode, tenant.id);
  }

  // 2. cookieStoreId
  if (!resolvedStore && cookieStoreId) {
    resolvedStore = await validateStoreInTenant(cookieStoreId, tenant.id);
  }

  // 3. Customer's preferredStoreId in DB
  if (!resolvedStore && userEmail) {
    const preferredId = await inferStoreFromPreferred(userEmail, tenant.id);
    if (preferredId) {
      resolvedStore = await validateStoreInTenant(preferredId, tenant.id);
    }
  }

  // 4. Most recent order's store
  if (!resolvedStore && userEmail) {
    const recentStoreId = await inferStoreFromRecentOrder(userEmail, tenant.id);
    if (recentStoreId) {
      resolvedStore = await validateStoreInTenant(recentStoreId, tenant.id);
    }
  }

  // 5. Auto-select when tenant has exactly one customer-facing store
  if (!resolvedStore && allStores.length === 1) {
    resolvedStore = allStores[0];
  }

  if (!resolvedStore) return null;

  return {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    tenantName: tenant.displayName,
    storeId: resolvedStore.id,
    storeName: resolvedStore.name,
    storeCode: resolvedStore.code,
    isMultiStore,
  };
}

/**
 * Returns all customer-facing stores for a tenant (for the store-selection UI).
 * Returns null if the tenant does not exist or is inactive.
 */
export async function getSelectableStores(
  tenantSlug: string
): Promise<{ tenant: { id: string; name: string }; stores: StoreOption[] } | null> {
  const tenant = await fetchTenant(tenantSlug);
  if (!tenant || tenant.status === "ARCHIVED" || tenant.status === "SUSPENDED") return null;

  const stores = await fetchCustomerFacingStores(tenant.id);
  return { tenant: { id: tenant.id, name: tenant.displayName }, stores };
}

/**
 * Persists the customer's preferred store in the DB so the preference survives
 * cookie expiry and is available on other devices.
 */
export async function saveCustomerPreferredStore(
  userEmail: string,
  tenantId: string,
  storeId: string
): Promise<void> {
  await prisma.customer.updateMany({
    where: { tenantId, email: userEmail },
    data: { preferredStoreId: storeId },
  });
}
