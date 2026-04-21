/**
 * Owner Suppliers Service — Cost Management Phase 3 (updated for platform suppliers).
 *
 * Manage suppliers, their products, and links to ingredients.
 * All functions scoped to tenantId / storeId where appropriate.
 *
 * As of the platform supplier redesign:
 * - PLATFORM suppliers are admin-managed and visible to all owners (read-only browse).
 * - STORE suppliers are legacy tenant-managed (backward compat).
 * - listAvailableSuppliers() returns both PLATFORM and the tenant's own STORE suppliers.
 * - linkIngredientToSupplierProduct() allows linking to PLATFORM supplier products.
 */
import { prisma } from "@/lib/prisma";
import type {
  Supplier,
  SupplierDetail,
  SupplierProduct,
  IngredientSupplierLink,
  SupplierListResult,
  CreateSupplierInput,
  UpdateSupplierInput,
  UpsertSupplierProductInput,
  UpdateSupplierProductInput,
  SupplierFilters,
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

function toSupplier(row: RawSupplier, productCount = 0): Supplier {
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
    productCount: row._count?.products ?? productCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toSupplierProduct(row: RawSupplierProduct): SupplierProduct {
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

// ─── Supplier CRUD ────────────────────────────────────────────────────────────

/**
 * List all STORE-scope suppliers for the given tenant (legacy path).
 * Use listAvailableSuppliers() for owner browse which includes PLATFORM suppliers.
 */
export async function listSuppliers(
  tenantId: string,
  filters: SupplierFilters = {}
): Promise<SupplierListResult> {
  const { storeId, page = 1, pageSize = 20 } = filters;

  const where = {
    tenantId,
    deletedAt: null,
    ...(storeId ? { storeId } : {}),
  };

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

/**
 * List available suppliers for an owner: PLATFORM suppliers + the tenant's own STORE suppliers.
 * Owners use this to browse and select suppliers to attach credentials to.
 */
export async function listAvailableSuppliers(
  tenantId: string,
  filters: SupplierFilters = {}
): Promise<SupplierListResult> {
  const { page = 1, pageSize = 50 } = filters;

  const where = {
    deletedAt: null,
    OR: [
      { scope: "PLATFORM" as const },
      { tenantId },
    ],
  };

  const [rows, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      include: { _count: { select: { products: true } } },
      orderBy: [{ scope: "asc" }, { name: "asc" }],
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

export async function getSupplierDetail(
  tenantId: string,
  supplierId: string
): Promise<SupplierDetail> {
  // Allow access to PLATFORM suppliers or the tenant's own STORE suppliers
  const row = await prisma.supplier.findFirst({
    where: {
      id: supplierId,
      deletedAt: null,
      OR: [{ scope: "PLATFORM" }, { tenantId }],
    },
    include: {
      products: {
        where: { deletedAt: null },
        orderBy: { name: "asc" },
      },
    },
  });
  if (!row) throw new Error(`Supplier ${supplierId} not found`);

  const { products, ...rest } = row as RawSupplier & {
    products: RawSupplierProduct[];
  };
  return {
    ...toSupplier(rest),
    products: products.map(toSupplierProduct),
  };
}

export async function createSupplier(
  tenantId: string,
  input: CreateSupplierInput
): Promise<Supplier> {
  const row = await prisma.supplier.create({
    data: {
      scope: "STORE",
      tenantId,
      storeId: input.storeId,
      name: input.name,
      websiteUrl: input.websiteUrl ?? null,
      contactEmail: input.contactEmail ?? null,
      contactPhone: input.contactPhone ?? null,
      notes: input.notes ?? null,
    },
    include: { _count: { select: { products: true } } },
  });
  return toSupplier(row as RawSupplier);
}

export async function updateSupplier(
  tenantId: string,
  supplierId: string,
  input: UpdateSupplierInput
): Promise<Supplier> {
  const existing = await prisma.supplier.findFirst({
    where: { id: supplierId, tenantId, deletedAt: null },
  });
  if (!existing) throw new Error(`Supplier ${supplierId} not found`);

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

export async function deleteSupplier(
  tenantId: string,
  supplierId: string
): Promise<void> {
  const existing = await prisma.supplier.findFirst({
    where: { id: supplierId, tenantId, deletedAt: null },
  });
  if (!existing) throw new Error(`Supplier ${supplierId} not found`);

  await prisma.supplier.update({
    where: { id: supplierId },
    data: { deletedAt: new Date() },
  });
}

// ─── Supplier Product CRUD ────────────────────────────────────────────────────

export async function listSupplierProducts(
  tenantId: string,
  supplierId: string
): Promise<SupplierProduct[]> {
  // Allow access to PLATFORM or the tenant's own STORE suppliers
  const supplier = await prisma.supplier.findFirst({
    where: {
      id: supplierId,
      deletedAt: null,
      OR: [{ scope: "PLATFORM" }, { tenantId }],
    },
  });
  if (!supplier) throw new Error(`Supplier ${supplierId} not found`);

  const rows = await prisma.supplierProduct.findMany({
    where: { supplierId, deletedAt: null },
    orderBy: { name: "asc" },
  });
  return rows.map((r) => toSupplierProduct(r as RawSupplierProduct));
}

export async function createSupplierProduct(
  tenantId: string,
  supplierId: string,
  input: UpsertSupplierProductInput
): Promise<SupplierProduct> {
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, tenantId, deletedAt: null },
  });
  if (!supplier) throw new Error(`Supplier ${supplierId} not found`);

  const row = await prisma.supplierProduct.create({
    data: {
      supplierId,
      name: input.name,
      externalUrl: input.externalUrl ?? null,
      currentPrice: input.currentPrice,
      unit: input.unit,
    },
  });
  return toSupplierProduct(row as RawSupplierProduct);
}

export async function updateSupplierProduct(
  tenantId: string,
  supplierId: string,
  productId: string,
  input: UpdateSupplierProductInput
): Promise<SupplierProduct> {
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, tenantId, deletedAt: null },
  });
  if (!supplier) throw new Error(`Supplier ${supplierId} not found`);

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
  return toSupplierProduct(row as RawSupplierProduct);
}

export async function deleteSupplierProduct(
  tenantId: string,
  supplierId: string,
  productId: string
): Promise<void> {
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, tenantId, deletedAt: null },
  });
  if (!supplier) throw new Error(`Supplier ${supplierId} not found`);

  const existing = await prisma.supplierProduct.findFirst({
    where: { id: productId, supplierId, deletedAt: null },
  });
  if (!existing) throw new Error(`SupplierProduct ${productId} not found`);

  await prisma.supplierProduct.update({
    where: { id: productId },
    data: { deletedAt: new Date() },
  });
}

// ─── Ingredient ↔ SupplierProduct Links ──────────────────────────────────────

export async function getIngredientLinks(
  tenantId: string,
  ingredientId: string
): Promise<IngredientSupplierLink[]> {
  // Verify ingredient belongs to tenant
  const ingredient = await prisma.ingredient.findFirst({
    where: { id: ingredientId, tenantId, deletedAt: null },
  });
  if (!ingredient) throw new Error(`Ingredient ${ingredientId} not found`);

  const rows = await prisma.ingredientSupplierLink.findMany({
    where: { ingredientId },
    include: {
      supplierProduct: {
        select: {
          name: true,
          supplier: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return rows.map((r) => ({
    id: r.id,
    ingredientId: r.ingredientId,
    supplierProductId: r.supplierProductId,
    supplierProductName: r.supplierProduct.name,
    supplierName: r.supplierProduct.supplier.name,
    isPreferred: r.isPreferred,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function linkIngredientToSupplierProduct(
  tenantId: string,
  ingredientId: string,
  supplierProductId: string,
  isPreferred = false
): Promise<IngredientSupplierLink> {
  // Verify ingredient belongs to tenant
  const ingredient = await prisma.ingredient.findFirst({
    where: { id: ingredientId, tenantId, deletedAt: null },
  });
  if (!ingredient) throw new Error(`Ingredient ${ingredientId} not found`);

  // Verify supplier product belongs to a PLATFORM supplier OR to the tenant's own STORE supplier
  const supplierProduct = await prisma.supplierProduct.findFirst({
    where: {
      id: supplierProductId,
      deletedAt: null,
      supplier: {
        deletedAt: null,
        OR: [{ scope: "PLATFORM" }, { tenantId }],
      },
    },
    include: { supplier: { select: { name: true } } },
  });
  if (!supplierProduct) throw new Error(`SupplierProduct ${supplierProductId} not found`);

  // If marking as preferred, unset other preferred links for this ingredient
  if (isPreferred) {
    await prisma.ingredientSupplierLink.updateMany({
      where: { ingredientId, isPreferred: true },
      data: { isPreferred: false },
    });
  }

  const row = await prisma.ingredientSupplierLink.upsert({
    where: {
      ingredientId_supplierProductId: { ingredientId, supplierProductId },
    },
    create: { ingredientId, supplierProductId, isPreferred },
    update: { isPreferred },
    include: {
      supplierProduct: {
        select: { name: true, supplier: { select: { name: true } } },
      },
    },
  });

  return {
    id: row.id,
    ingredientId: row.ingredientId,
    supplierProductId: row.supplierProductId,
    supplierProductName: row.supplierProduct.name,
    supplierName: row.supplierProduct.supplier.name,
    isPreferred: row.isPreferred,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function unlinkIngredientFromSupplierProduct(
  tenantId: string,
  linkId: string
): Promise<void> {
  const link = await prisma.ingredientSupplierLink.findFirst({
    where: {
      id: linkId,
      ingredient: { tenantId, deletedAt: null },
    },
  });
  if (!link) throw new Error(`IngredientSupplierLink ${linkId} not found`);

  await prisma.ingredientSupplierLink.delete({ where: { id: linkId } });
}
