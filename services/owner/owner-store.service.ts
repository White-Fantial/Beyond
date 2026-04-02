import { prisma } from "@/lib/prisma";
import type { OwnerStoreInfo } from "@/types/owner";

export async function getOwnerStoreInfo(tenantId: string): Promise<OwnerStoreInfo | null> {
  const store = await prisma.store.findFirst({
    where: { tenantId, status: { not: "ARCHIVED" } },
    include: { storeSettings: true },
    orderBy: { createdAt: "asc" },
  });

  if (!store) return null;

  return {
    id: store.id,
    name: store.name,
    email: store.email,
    phone: store.phone,
    addressLine1: store.addressLine1,
    city: store.city,
    region: store.region,
    postalCode: store.postalCode,
    timezone: store.timezone,
    currency: store.currency,
    taxRate: store.storeSettings?.taxRate ? Number(store.storeSettings.taxRate) : 0,
    serviceFeeRate: store.storeSettings?.serviceFeeRate
      ? Number(store.storeSettings.serviceFeeRate)
      : 0,
    pickupIntervalMinutes: store.storeSettings?.pickupIntervalMinutes ?? 15,
    defaultPrepTimeMinutes: store.storeSettings?.defaultPrepTimeMinutes ?? 20,
    logoUrl: store.storeSettings?.logoUrl ?? null,
  };
}

export async function getOwnerStores(tenantId: string) {
  return prisma.store.findMany({
    where: { tenantId, status: { not: "ARCHIVED" } },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      timezone: true,
      currency: true,
      status: true,
    },
    orderBy: { name: "asc" },
  });
}
