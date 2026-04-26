import { prisma } from "@/lib/prisma";
import type { Store } from "@/domains/store/types";

function mapStore(row: {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  displayName: string;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  phone: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  countryCode: string;
  timezone: string;
  currency: string;
  openingDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}): Store {
  return row;
}

export async function getStoresByTenant(tenantId: string): Promise<Store[]> {
  const stores = await prisma.store.findMany({
    where: { tenantId, status: { not: "ARCHIVED" } },
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      tenantId: true,
      code: true,
      name: true,
      displayName: true,
      status: true,
      phone: true,
      email: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      region: true,
      postalCode: true,
      countryCode: true,
      timezone: true,
      currency: true,
      openingDate: true,
      createdAt: true,
      updatedAt: true,
      archivedAt: true,
    },
  });

  return stores.map(mapStore);
}

export async function getStore(storeId: string, tenantId: string): Promise<Store | null> {
  const store = await prisma.store.findFirst({
    where: { id: storeId, tenantId },
    select: {
      id: true,
      tenantId: true,
      code: true,
      name: true,
      displayName: true,
      status: true,
      phone: true,
      email: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      region: true,
      postalCode: true,
      countryCode: true,
      timezone: true,
      currency: true,
      openingDate: true,
      createdAt: true,
      updatedAt: true,
      archivedAt: true,
    },
  });

  return store ? mapStore(store) : null;
}

export async function createStore(
  tenantId: string,
  data: Omit<Store, "id" | "tenantId" | "createdAt" | "updatedAt">
): Promise<Store> {
  const created = await prisma.store.create({
    data: {
      tenantId,
      code: data.code,
      name: data.name,
      displayName: data.displayName,
      status: data.status,
      phone: data.phone ?? null,
      email: data.email ?? null,
      addressLine1: data.addressLine1 ?? null,
      addressLine2: data.addressLine2 ?? null,
      city: data.city ?? null,
      region: data.region ?? null,
      postalCode: data.postalCode ?? null,
      countryCode: data.countryCode,
      timezone: data.timezone,
      currency: data.currency,
      openingDate: data.openingDate ?? null,
      archivedAt: data.archivedAt ?? null,
    },
    select: {
      id: true,
      tenantId: true,
      code: true,
      name: true,
      displayName: true,
      status: true,
      phone: true,
      email: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      region: true,
      postalCode: true,
      countryCode: true,
      timezone: true,
      currency: true,
      openingDate: true,
      createdAt: true,
      updatedAt: true,
      archivedAt: true,
    },
  });

  return mapStore(created);
}
