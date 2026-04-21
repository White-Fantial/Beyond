/**
 * Admin Suppliers Service — Platform Supplier Management.
 *
 * Platform admins register and manage PLATFORM-scope suppliers that are visible
 * to all owners. Owners can then attach credentials to these suppliers and browse
 * their products.
 */
import { prisma } from "@/lib/prisma";
import type {
  Supplier,
  SupplierDetail,
  SupplierProduct,
  SupplierListResult,
  CreatePlatformSupplierInput,
  UpdateSupplierInput,
  UpsertSupplierProductInput,
  UpdateSupplierProductInput,
} from "@/types/owner-suppliers";
import type { IngredientUnit } from "@/types/owner-ingredients";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type RawSupplier = {
  id: string;
  scope: string;
  tenantId: string | null;
  storeId: string | null;
  name: string;
  websiteUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { products: number };
};

type RawSupplierProduct = {
  id: string;
  supplierId: string;
  name: string;
  externalUrl: string | null;
  currentPrice: number;
  basePrice: number;
  basePriceUpdatedAt: Date | null;
  basePriceScrapedUserCount: number;
  unit: string;
  lastScrapedAt: Date | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

function toSupplier(row: RawSupplier): Supplier {
  return {
    id: row.id,
    scope: row.scope as Supplier["scope"],
    tenantId: row.tenantId,
    storeId: row.storeId,
    name: row.name,
    websiteUrl: row.websiteUrl,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    notes: row.notes,
    productCount: row._count?.products ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toProduct(row: RawSupplierProduct): SupplierProduct {
  return {
    id: row.id,
    supplierId: row.supplierId,
    name: row.name,
    externalUrl: row.externalUrl,
    currentPrice: row.currentPrice,
    basePrice: row.basePrice,
    basePriceUpdatedAt: row.basePriceUpdatedAt?.toISOString() ?? null,
    basePriceScrapedUserCount: row.basePriceScrapedUserCount,
    unit: row.unit as IngredientUnit,
    lastScrapedAt: row.lastScrapedAt?.toISOString() ?? null,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Platform Supplier CRUD ───────────────────────────────────────────────────

export async function listPlatformSuppliers(
  page = 1,
  pageSize = 50
): Promise<SupplierListResult> {
  const where = { scope: "PLATFORM" as const, deletedAt: null };

  const [rows, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.supplier.count({ where }),
  ]);

  return {
    items: rows.map((r) => toSupplier(r as RawSupplier)),
    total,
    page,
    pageSize,
  };
}

export async function getPlatformSupplierDetail(
  supplierId: string
): Promise<SupplierDetail> {
  const row = await prisma.supplier.findFirst({
    where: { id: supplierId, scope: "PLATFORM", deletedAt: null },
    include: {
      products: {
        where: { deletedAt: null },
        orderBy: { name: "asc" },
      },
    },
  });
  if (!row) throw new Error(`PlatformSupplier ${supplierId} not found`);

  const { products, ...rest } = row as RawSupplier & {
    products: RawSupplierProduct[];
  };
  return {
    ...toSupplier(rest),
    products: products.map(toProduct),
  };
}

export async function createPlatformSupplier(
  input: CreatePlatformSupplierInput
): Promise<Supplier> {
  const row = await prisma.supplier.create({
    data: {
      scope: "PLATFORM",
      tenantId: null,
      storeId: null,
      name: input.name.trim(),
      websiteUrl: input.websiteUrl?.trim() ?? null,
      contactEmail: input.contactEmail?.trim() ?? null,
      contactPhone: input.contactPhone?.trim() ?? null,
      notes: input.notes?.trim() ?? null,
    },
    include: { _count: { select: { products: true } } },
  });
  return toSupplier(row as RawSupplier);
}

export async function updatePlatformSupplier(
  supplierId: string,
  input: UpdateSupplierInput
): Promise<Supplier> {
  const existing = await prisma.supplier.findFirst({
    where: { id: supplierId, scope: "PLATFORM", deletedAt: null },
  });
  if (!existing) throw new Error(`PlatformSupplier ${supplierId} not found`);

  const row = await prisma.supplier.update({
    where: { id: supplierId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.websiteUrl !== undefined ? { websiteUrl: input.websiteUrl } : {}),
      ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail } : {}),
      ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
    include: { _count: { select: { products: true } } },
  });
  return toSupplier(row as RawSupplier);
}

export async function deletePlatformSupplier(supplierId: string): Promise<void> {
  const existing = await prisma.supplier.findFirst({
    where: { id: supplierId, scope: "PLATFORM", deletedAt: null },
  });
  if (!existing) throw new Error(`PlatformSupplier ${supplierId} not found`);

  await prisma.supplier.update({
    where: { id: supplierId },
    data: { deletedAt: new Date() },
  });
}

// ─── Platform Supplier Product CRUD ──────────────────────────────────────────

export async function createPlatformSupplierProduct(
  supplierId: string,
  input: UpsertSupplierProductInput
): Promise<SupplierProduct> {
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, scope: "PLATFORM", deletedAt: null },
  });
  if (!supplier) throw new Error(`PlatformSupplier ${supplierId} not found`);

  const row = await prisma.supplierProduct.create({
    data: {
      supplierId,
      name: input.name.trim(),
      externalUrl: input.externalUrl?.trim() ?? null,
      currentPrice: input.currentPrice,
      unit: input.unit,
    },
  });
  return toProduct(row as RawSupplierProduct);
}

export async function updatePlatformSupplierProduct(
  supplierId: string,
  productId: string,
  input: UpdateSupplierProductInput
): Promise<SupplierProduct> {
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, scope: "PLATFORM", deletedAt: null },
  });
  if (!supplier) throw new Error(`PlatformSupplier ${supplierId} not found`);

  const existing = await prisma.supplierProduct.findFirst({
    where: { id: productId, supplierId, deletedAt: null },
  });
  if (!existing) throw new Error(`SupplierProduct ${productId} not found`);

  const row = await prisma.supplierProduct.update({
    where: { id: productId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.externalUrl !== undefined ? { externalUrl: input.externalUrl } : {}),
      ...(input.currentPrice !== undefined ? { currentPrice: input.currentPrice } : {}),
      ...(input.unit !== undefined ? { unit: input.unit } : {}),
    },
  });
  return toProduct(row as RawSupplierProduct);
}

export async function deletePlatformSupplierProduct(
  supplierId: string,
  productId: string
): Promise<void> {
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, scope: "PLATFORM", deletedAt: null },
  });
  if (!supplier) throw new Error(`PlatformSupplier ${supplierId} not found`);

  const existing = await prisma.supplierProduct.findFirst({
    where: { id: productId, supplierId, deletedAt: null },
  });
  if (!existing) throw new Error(`SupplierProduct ${productId} not found`);

  await prisma.supplierProduct.update({
    where: { id: productId },
    data: { deletedAt: new Date() },
  });
}
