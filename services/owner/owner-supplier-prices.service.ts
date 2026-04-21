/**
 * Owner Supplier Prices Service.
 *
 * Manages SupplierContractPrice and SupplierPriceRecord for a tenant.
 *
 * Cost resolution priority for recipe ingredient costing:
 *   1. Active contract price (SupplierContractPrice with effectiveTo IS NULL)
 *   2. Latest SupplierPriceRecord for this tenant
 *   3. Platform-wide SupplierProduct.referencePrice
 *   4. 0 (surfaced as "unknown cost" in the UI)
 */
import { prisma } from "@/lib/prisma";
import type {
  SupplierContractPrice,
  SupplierPriceRecord,
  CreateContractPriceInput,
  CreatePriceRecordInput,
  ContractPriceListResult,
  PriceRecordListResult,
} from "@/types/owner-supplier-prices";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toContractPrice(row: {
  id: string;
  supplierProductId: string;
  tenantId: string;
  price: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  contractRef: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SupplierContractPrice {
  return {
    id: row.id,
    supplierProductId: row.supplierProductId,
    tenantId: row.tenantId,
    price: row.price,
    effectiveFrom: row.effectiveFrom.toISOString(),
    effectiveTo: row.effectiveTo?.toISOString() ?? null,
    contractRef: row.contractRef,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toPriceRecord(row: {
  id: string;
  supplierProductId: string;
  tenantId: string;
  observedPrice: number;
  source: string;
  credentialId: string | null;
  observedAt: Date;
  notes: string | null;
}): SupplierPriceRecord {
  return {
    id: row.id,
    supplierProductId: row.supplierProductId,
    tenantId: row.tenantId,
    observedPrice: row.observedPrice,
    source: row.source as SupplierPriceRecord["source"],
    credentialId: row.credentialId,
    observedAt: row.observedAt.toISOString(),
    notes: row.notes,
  };
}

async function verifySupplierProductAccess(
  tenantId: string,
  supplierProductId: string
): Promise<void> {
  const product = await prisma.supplierProduct.findFirst({
    where: {
      id: supplierProductId,
      deletedAt: null,
      supplier: { tenantId, deletedAt: null },
    },
  });
  if (!product) throw new Error(`SupplierProduct ${supplierProductId} not found`);
}

// ─── Contract Prices ──────────────────────────────────────────────────────────

/**
 * List all contract prices (active and historical) for a supplier product and tenant.
 */
export async function listContractPrices(
  tenantId: string,
  supplierProductId: string
): Promise<ContractPriceListResult> {
  await verifySupplierProductAccess(tenantId, supplierProductId);

  const rows = await prisma.supplierContractPrice.findMany({
    where: { supplierProductId, tenantId },
    orderBy: { effectiveFrom: "desc" },
  });

  return { items: rows.map(toContractPrice), total: rows.length };
}

/**
 * Create a new contract price for a supplier product.
 * Automatically ends the current active contract price (sets effectiveTo = now)
 * before creating the new one, so only one row is active at a time.
 */
export async function createContractPrice(
  tenantId: string,
  supplierProductId: string,
  input: CreateContractPriceInput
): Promise<SupplierContractPrice> {
  await verifySupplierProductAccess(tenantId, supplierProductId);

  const now = new Date();

  // End any currently active contract price
  await prisma.supplierContractPrice.updateMany({
    where: { supplierProductId, tenantId, effectiveTo: null },
    data: { effectiveTo: now },
  });

  const row = await prisma.supplierContractPrice.create({
    data: {
      supplierProductId,
      tenantId,
      price: input.price,
      effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : now,
      contractRef: input.contractRef ?? null,
      notes: input.notes ?? null,
    },
  });

  return toContractPrice(row);
}

/**
 * Manually end a contract price (set effectiveTo = now).
 */
export async function endContractPrice(
  tenantId: string,
  contractPriceId: string
): Promise<SupplierContractPrice> {
  const existing = await prisma.supplierContractPrice.findFirst({
    where: { id: contractPriceId, tenantId, effectiveTo: null },
  });
  if (!existing) {
    throw new Error(`Active contract price ${contractPriceId} not found`);
  }

  const row = await prisma.supplierContractPrice.update({
    where: { id: contractPriceId },
    data: { effectiveTo: new Date() },
  });

  return toContractPrice(row);
}

/**
 * Get the currently active contract price for a tenant and supplier product.
 * Returns null if no active contract price exists.
 */
export async function getCurrentContractPrice(
  tenantId: string,
  supplierProductId: string
): Promise<SupplierContractPrice | null> {
  const row = await prisma.supplierContractPrice.findFirst({
    where: { supplierProductId, tenantId, effectiveTo: null },
    orderBy: { effectiveFrom: "desc" },
  });
  return row ? toContractPrice(row) : null;
}

// ─── Price Records ────────────────────────────────────────────────────────────

/**
 * List price observation records for a supplier product and tenant (newest first).
 */
export async function listPriceRecords(
  tenantId: string,
  supplierProductId: string,
  filters: { page?: number; pageSize?: number } = {}
): Promise<PriceRecordListResult> {
  await verifySupplierProductAccess(tenantId, supplierProductId);

  const { page = 1, pageSize = 30 } = filters;

  const where = { supplierProductId, tenantId };

  const [rows, total] = await Promise.all([
    prisma.supplierPriceRecord.findMany({
      where,
      orderBy: { observedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.supplierPriceRecord.count({ where }),
  ]);

  return { items: rows.map(toPriceRecord), total, page, pageSize };
}

/**
 * Manually record a price observation for a supplier product.
 */
export async function createManualPriceRecord(
  tenantId: string,
  supplierProductId: string,
  input: CreatePriceRecordInput
): Promise<SupplierPriceRecord> {
  await verifySupplierProductAccess(tenantId, supplierProductId);

  const row = await prisma.supplierPriceRecord.create({
    data: {
      supplierProductId,
      tenantId,
      observedPrice: input.observedPrice,
      source: input.source ?? "MANUAL_ENTRY",
      observedAt: new Date(),
      notes: input.notes ?? null,
    },
  });

  return toPriceRecord(row);
}

// ─── Cost Resolution ──────────────────────────────────────────────────────────

/**
 * Resolve the effective cost (in millicents) for a (tenantId, supplierProductId) pair.
 *
 * Priority:
 *   1. Active contract price (effectiveTo IS NULL)
 *   2. Latest SupplierPriceRecord for this tenant
 *   3. SupplierProduct.referencePrice (platform-wide aggregate)
 *   4. 0 — unresolved, caller should surface as "unknown cost"
 *
 * Returns `{ price, resolved }` where `resolved` is false only when the price is 0
 * because no pricing data exists.
 */
export async function resolveEffectiveCost(
  tenantId: string,
  supplierProductId: string
): Promise<{ price: number; resolved: boolean }> {
  // 1. Active contract price
  const contract = await prisma.supplierContractPrice.findFirst({
    where: { supplierProductId, tenantId, effectiveTo: null },
    orderBy: { effectiveFrom: "desc" },
    select: { price: true },
  });
  if (contract) return { price: contract.price, resolved: true };

  // 2. Latest price record
  const record = await prisma.supplierPriceRecord.findFirst({
    where: { supplierProductId, tenantId },
    orderBy: { observedAt: "desc" },
    select: { observedPrice: true },
  });
  if (record) return { price: record.observedPrice, resolved: true };

  // 3. Platform reference price
  const product = await prisma.supplierProduct.findFirst({
    where: { id: supplierProductId },
    select: { referencePrice: true },
  });
  if (product && product.referencePrice > 0) {
    return { price: product.referencePrice, resolved: true };
  }

  // 4. Unresolved
  return { price: 0, resolved: false };
}

/**
 * Bulk-resolve effective costs for multiple (supplierProductId) values under one tenant.
 * Returns a Map from supplierProductId to { price, resolved }.
 * Optimised to load all relevant data in three queries instead of N×3.
 */
export async function resolveEffectiveCostsBulk(
  tenantId: string,
  supplierProductIds: string[]
): Promise<Map<string, { price: number; resolved: boolean }>> {
  if (supplierProductIds.length === 0) return new Map();

  const result = new Map<string, { price: number; resolved: boolean }>(
    supplierProductIds.map((id) => [id, { price: 0, resolved: false }])
  );

  // 1. Active contract prices (one per product, take the latest effectiveFrom)
  const contracts = await prisma.supplierContractPrice.findMany({
    where: { supplierProductId: { in: supplierProductIds }, tenantId, effectiveTo: null },
    orderBy: { effectiveFrom: "desc" },
    select: { supplierProductId: true, price: true },
  });
  for (const c of contracts) {
    if (!result.get(c.supplierProductId)?.resolved) {
      result.set(c.supplierProductId, { price: c.price, resolved: true });
    }
  }

  // 2. Latest price records for products still unresolved
  const unresolvedAfterContracts = supplierProductIds.filter(
    (id) => !result.get(id)?.resolved
  );
  if (unresolvedAfterContracts.length > 0) {
    // Fetch the most recent record per product using a raw grouping approach
    const records = await prisma.supplierPriceRecord.findMany({
      where: { supplierProductId: { in: unresolvedAfterContracts }, tenantId },
      orderBy: { observedAt: "desc" },
      select: { supplierProductId: true, observedPrice: true },
    });
    // Deduplicate: keep first (newest) per product
    const seen = new Set<string>();
    for (const r of records) {
      if (!seen.has(r.supplierProductId)) {
        seen.add(r.supplierProductId);
        result.set(r.supplierProductId, { price: r.observedPrice, resolved: true });
      }
    }
  }

  // 3. Reference prices for products still unresolved
  const unresolvedAfterRecords = supplierProductIds.filter(
    (id) => !result.get(id)?.resolved
  );
  if (unresolvedAfterRecords.length > 0) {
    const products = await prisma.supplierProduct.findMany({
      where: { id: { in: unresolvedAfterRecords } },
      select: { id: true, referencePrice: true },
    });
    for (const p of products) {
      if (p.referencePrice > 0) {
        result.set(p.id, { price: p.referencePrice, resolved: true });
      }
    }
  }

  return result;
}
