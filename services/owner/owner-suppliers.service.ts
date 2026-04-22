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
  purchaseQty: number;
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
    purchaseQty: row.purchaseQty,
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

/**
 * Helper to serialise a link row from DB into the API type.
 */
function toLinkRow(r: {
  id: string;
  ingredientId: string;
  supplierProductId: string;
  tenantId: string | null;
  isPreferred: boolean;
  createdAt: Date;
  supplierProduct: {
    name: string;
    referencePrice: number;
    lastScrapedAt: Date | null;
    supplier: { name: string };
  };
}): IngredientSupplierLink {
  return {
    id: r.id,
    ingredientId: r.ingredientId,
    supplierProductId: r.supplierProductId,
    tenantId: r.tenantId,
    supplierProductName: r.supplierProduct.name,
    supplierName: r.supplierProduct.supplier.name,
    isPreferred: r.isPreferred,
    referencePrice: r.supplierProduct.referencePrice,
    lastScrapedAt: r.supplierProduct.lastScrapedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

const linkInclude = {
  supplierProduct: {
    select: {
      name: true,
      referencePrice: true,
      lastScrapedAt: true,
      supplier: { select: { name: true } },
    },
  },
} as const;

/**
 * Returns all supplier-product links visible to a tenant for a given ingredient.
 * Includes both platform-level links (tenantId=null) and this tenant's own links.
 * Works for both STORE-scope (tenant-owned) and PLATFORM-scope ingredients.
 */
export async function getIngredientLinks(
  tenantId: string,
  ingredientId: string
): Promise<IngredientSupplierLink[]> {
  const ingredient = await prisma.ingredient.findFirst({
    where: {
      id: ingredientId,
      deletedAt: null,
      OR: [{ tenantId }, { scope: "PLATFORM" }],
    },
  });
  if (!ingredient) throw new Error(`Ingredient ${ingredientId} not found`);

  const rows = await prisma.ingredientSupplierLink.findMany({
    where: {
      ingredientId,
      OR: [{ tenantId: null }, { tenantId }],
    },
    include: linkInclude,
    orderBy: { createdAt: "asc" },
  });

  return rows.map(toLinkRow);
}

/**
 * Create a tenant-specific supplier-product link for an ingredient.
 * Owner-created links always carry the tenant's own tenantId so platform
 * links (tenantId=null, admin-managed) remain separate.
 * If isPreferred=true, clears any existing preferred link for this
 * (ingredientId, tenantId) pair first.
 */
export async function linkIngredientToSupplierProduct(
  tenantId: string,
  ingredientId: string,
  supplierProductId: string,
  isPreferred = false
): Promise<IngredientSupplierLink> {
  const ingredient = await prisma.ingredient.findFirst({
    where: {
      id: ingredientId,
      deletedAt: null,
      OR: [{ tenantId }, { scope: "PLATFORM" }],
    },
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
    // Clear existing preferred within this tenant's scope
    await prisma.ingredientSupplierLink.updateMany({
      where: { ingredientId, tenantId, isPreferred: true },
      data: { isPreferred: false },
    });
  }

  // Find existing tenant-specific link for this (ingredient, product, tenant) triple
  const existing = await prisma.ingredientSupplierLink.findFirst({
    where: { ingredientId, supplierProductId, tenantId },
  });

  let row;
  if (existing) {
    row = await prisma.ingredientSupplierLink.update({
      where: { id: existing.id },
      data: { isPreferred },
      include: linkInclude,
    });
  } else {
    row = await prisma.ingredientSupplierLink.create({
      data: { ingredientId, supplierProductId, tenantId, isPreferred },
      include: linkInclude,
    });
  }

  return toLinkRow(row);
}

/**
 * Toggle isPreferred for an existing link.
 * When setting preferred=true, clears the previous preferred link
 * within the same (ingredientId, tenantId) scope.
 */
export async function setLinkPreferred(
  tenantId: string,
  linkId: string,
  isPreferred: boolean
): Promise<IngredientSupplierLink> {
  const link = await prisma.ingredientSupplierLink.findFirst({
    where: {
      id: linkId,
      OR: [{ tenantId }, { tenantId: null }],
    },
    include: linkInclude,
  });
  if (!link) throw new Error(`IngredientSupplierLink ${linkId} not found`);

  if (isPreferred) {
    await prisma.ingredientSupplierLink.updateMany({
      where: { ingredientId: link.ingredientId, tenantId, isPreferred: true },
      data: { isPreferred: false },
    });
  }

  const updated = await prisma.ingredientSupplierLink.update({
    where: { id: linkId },
    data: { isPreferred },
    include: linkInclude,
  });

  return toLinkRow(updated);
}

export async function unlinkIngredientFromSupplierProduct(
  tenantId: string,
  linkId: string
): Promise<void> {
  // Allow deleting tenant-specific links (tenantId=tenantId) only
  const link = await prisma.ingredientSupplierLink.findFirst({
    where: { id: linkId, tenantId },
  });
  if (!link) throw new Error(`IngredientSupplierLink ${linkId} not found`);

  await prisma.ingredientSupplierLink.delete({ where: { id: linkId } });
}
