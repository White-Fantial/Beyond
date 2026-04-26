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

const SUPPLIER_PRODUCT_UNITS = new Set<IngredientUnit>([
  "GRAM",
  "KG",
  "ML",
  "LITER",
  "EACH",
  "TSP",
  "TBSP",
  "OZ",
  "LB",
  "CUP",
  "PIECE",
]);

export interface BulkSupplierProductImportResult {
  totalRows: number;
  successCount: number;
  failedCount: number;
  createdCount: number;
  updatedCount: number;
  errors: Array<{ row: number; reason: string }>;
}

export interface BulkSupplierProductImportInput {
  name: string;
  externalUrl?: string;
  referencePrice: number;
  purchaseQty: number;
  unit: IngredientUnit;
}

export function normalizeSupplierProductUrl(rawUrl: string | null | undefined): string | null {
  const trimmed = rawUrl?.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    parsed.hash = "";
    parsed.username = "";
    parsed.password = "";
    parsed.hostname = parsed.hostname.toLowerCase();

    if (
      (parsed.protocol === "https:" && parsed.port === "443") ||
      (parsed.protocol === "http:" && parsed.port === "80")
    ) {
      parsed.port = "";
    }

    parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    const normalizedParams = [...parsed.searchParams.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
    parsed.search = normalizedParams ? `?${normalizedParams}` : "";

    return parsed.toString();
  } catch {
    return trimmed;
  }
}

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
  adapterType: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { products: number };
};

type RawSupplierProduct = {
  id: string;
  supplierId: string;
  name: string;
  externalUrl: string | null;
  externalUrlNormalized: string | null;
  referencePrice: number;
  purchaseQty: number;
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
    adapterType: row.adapterType,
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
    referencePrice: row.referencePrice,
    purchaseQty: row.purchaseQty,
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
      adapterType: input.adapterType?.trim() ?? null,
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
      ...(input.adapterType !== undefined ? { adapterType: input.adapterType } : {}),
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
      externalUrlNormalized: normalizeSupplierProductUrl(input.externalUrl),
      referencePrice: input.referencePrice ?? 0,
      purchaseQty: input.purchaseQty ?? 1,
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
      ...(input.externalUrl !== undefined
        ? {
            externalUrl: input.externalUrl,
            externalUrlNormalized: normalizeSupplierProductUrl(input.externalUrl),
          }
        : {}),
      ...(input.referencePrice !== undefined ? { referencePrice: input.referencePrice } : {}),
      ...(input.purchaseQty !== undefined ? { purchaseQty: input.purchaseQty } : {}),
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

export async function getPlatformSupplierProduct(
  supplierId: string,
  productId: string
): Promise<SupplierProduct> {
  const row = await prisma.supplierProduct.findFirst({
    where: { id: productId, supplierId, deletedAt: null },
  });
  if (!row) throw new Error(`SupplierProduct ${productId} not found`);
  return toProduct(row as RawSupplierProduct);
}

export async function importPlatformSupplierProducts(
  supplierId: string,
  rows: BulkSupplierProductImportInput[]
): Promise<BulkSupplierProductImportResult> {
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, scope: "PLATFORM", deletedAt: null },
  });
  if (!supplier) throw new Error(`PlatformSupplier ${supplierId} not found`);

  const result: BulkSupplierProductImportResult = {
    totalRows: rows.length,
    successCount: 0,
    failedCount: 0,
    createdCount: 0,
    updatedCount: 0,
    errors: [],
  };

  for (let index = 0; index < rows.length; index += 1) {
    const rowNumber = index + 1;
    const row = rows[index];

    try {
      if (!row.name.trim()) throw new Error("name is required");
      if (row.referencePrice < 0) throw new Error("referencePrice must be non-negative");
      if (!(row.purchaseQty > 0)) throw new Error("purchaseQty must be greater than zero");
      if (!SUPPLIER_PRODUCT_UNITS.has(row.unit)) throw new Error(`unit must be one of ${[...SUPPLIER_PRODUCT_UNITS].join(", ")}`);

      const normalizedUrl = normalizeSupplierProductUrl(row.externalUrl);
      const payload = {
        supplierId,
        name: row.name.trim(),
        externalUrl: row.externalUrl?.trim() || null,
        externalUrlNormalized: normalizedUrl,
        referencePrice: row.referencePrice,
        purchaseQty: row.purchaseQty,
        unit: row.unit,
      };

      if (normalizedUrl) {
        const existingByUrl = await prisma.supplierProduct.findFirst({
          where: {
            supplierId,
            externalUrlNormalized: normalizedUrl,
            purchaseQty: row.purchaseQty,
            unit: row.unit,
            deletedAt: null,
          },
        });

        if (existingByUrl) {
          await prisma.supplierProduct.update({
            where: { id: existingByUrl.id },
            data: payload,
          });
          result.updatedCount += 1;
          result.successCount += 1;
          continue;
        }
      }

      await prisma.supplierProduct.create({ data: payload });
      result.createdCount += 1;
      result.successCount += 1;
    } catch (error) {
      result.failedCount += 1;
      result.errors.push({
        row: rowNumber,
        reason: error instanceof Error ? error.message : "Unknown import error",
      });
    }
  }

  return result;
}

// ─── Platform-level ingredient ↔ SupplierProduct links ──────────────────────

const platformLinkInclude = {
  supplierProduct: {
    select: {
      name: true,
      referencePrice: true,
      lastScrapedAt: true,
      supplier: { select: { name: true } },
    },
  },
} as const;

type RawLink = {
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
};

function toPlatformIngredientLink(r: RawLink) {
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

export type PlatformIngredientLink = ReturnType<typeof toPlatformIngredientLink>;

export async function getPlatformIngredientLinks(
  ingredientId: string
): Promise<PlatformIngredientLink[]> {
  const rows = await prisma.ingredientSupplierLink.findMany({
    where: { ingredientId, tenantId: null },
    include: platformLinkInclude,
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toPlatformIngredientLink);
}

export async function addPlatformIngredientLink(
  ingredientId: string,
  supplierProductId: string
): Promise<PlatformIngredientLink> {
  const ingredient = await prisma.ingredient.findFirst({
    where: { id: ingredientId, deletedAt: null },
  });
  if (!ingredient) throw new Error(`PlatformIngredient ${ingredientId} not found`);

  const supplierProduct = await prisma.supplierProduct.findFirst({
    where: { id: supplierProductId, deletedAt: null },
  });
  if (!supplierProduct) throw new Error(`SupplierProduct ${supplierProductId} not found`);

  // Upsert: if the platform-level link already exists, return it as-is
  const existing = await prisma.ingredientSupplierLink.findFirst({
    where: { ingredientId, supplierProductId, tenantId: null },
    include: platformLinkInclude,
  });
  if (existing) return toPlatformIngredientLink(existing as RawLink);

  const row = await prisma.ingredientSupplierLink.create({
    data: { ingredientId, supplierProductId, tenantId: null, isPreferred: false },
    include: platformLinkInclude,
  });
  return toPlatformIngredientLink(row as RawLink);
}

export async function removePlatformIngredientLink(linkId: string): Promise<void> {
  const link = await prisma.ingredientSupplierLink.findFirst({
    where: { id: linkId, tenantId: null },
  });
  if (!link) throw new Error(`PlatformIngredientLink ${linkId} not found`);
  await prisma.ingredientSupplierLink.delete({ where: { id: linkId } });
}

// ─── Search platform supplier products ───────────────────────────────────────

export async function searchPlatformSupplierProducts(
  query: string,
  limit = 20
): Promise<(SupplierProduct & { supplierName: string })[]> {
  const rows = await prisma.supplierProduct.findMany({
    where: {
      deletedAt: null,
      supplier: { scope: "PLATFORM", deletedAt: null },
      ...(query.trim()
        ? { name: { contains: query.trim(), mode: "insensitive" } }
        : {}),
    },
    include: { supplier: { select: { name: true } } },
    orderBy: { name: "asc" },
    take: limit,
  });

  return rows.map((r) => ({
    ...toProduct(r as RawSupplierProduct),
    supplierName: (r as typeof r & { supplier: { name: string } }).supplier.name,
  }));
}
