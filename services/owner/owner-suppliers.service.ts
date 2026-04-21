/**
 * Owner Suppliers Service — updated for platform-only supplier model.
 *
 * PLATFORM suppliers are admin-managed and visible to all owners (read-only browse).
 * Owners attach credentials to platform suppliers and link their ingredients to
 * supplier products. There is no STORE-scope supplier creation from the owner side.
 */
import { prisma } from "@/lib/prisma";
import type {
  Supplier,
  SupplierDetail,
  SupplierProduct,
  IngredientSupplierLink,
  SupplierListResult,
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
  referencePrice: number;
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
    referencePrice: row.referencePrice,
    unit: row.unit as IngredientUnit,
    lastScrapedAt: row.lastScrapedAt?.toISOString() ?? null,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Supplier list / detail ───────────────────────────────────────────────────

/**
 * List available suppliers for an owner: PLATFORM suppliers (visible to all owners).
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

// ─── Supplier Product list ────────────────────────────────────────────────────

export async function listSupplierProducts(
  tenantId: string,
  supplierId: string
): Promise<SupplierProduct[]> {
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

// ─── Ingredient ↔ SupplierProduct Links ──────────────────────────────────────

export async function getIngredientLinks(
  tenantId: string,
  ingredientId: string
): Promise<IngredientSupplierLink[]> {
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
  const ingredient = await prisma.ingredient.findFirst({
    where: { id: ingredientId, tenantId, deletedAt: null },
  });
  if (!ingredient) throw new Error(`Ingredient ${ingredientId} not found`);

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
