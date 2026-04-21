/**
 * Owner Supplier Scraper Service — Cost Management Phase 4 & 5 (revised).
 *
 * Phase 4: Fetches current prices from supplier product URLs and updates the database.
 * Phase 5: Per-user credentialed scraping and reference-price computation.
 *
 * Reference price logic:
 *   Each user's credential is used to scrape their in-use supplier products.
 *   Observed prices are stored as SupplierPriceRecord rows (append-only, per-tenant).
 *   The maximum observed price across all tenants is stored as referencePrice on
 *   SupplierProduct. Owners without credentials see this referencePrice as a fallback.
 */
import { prisma } from "@/lib/prisma";
import { getScraperForUrl } from "@/lib/supplier-scraper";
import { credentialedScraper } from "@/lib/supplier-scraper/credentialed";
import { getDecryptedCredential } from "./owner-supplier-credentials.service";
import type { ScrapeResult } from "@/types/owner-suppliers";
import type { UserScrapeResult, UserScrapeRunResult, ReferencePriceInfo } from "@/types/owner-supplier-credentials";

// ─── Phase 4: unauthenticated scraping ────────────────────────────────────────

/**
 * Scrape a single supplier product URL and persist the new referencePrice.
 */
export async function scrapeSupplierProduct(
  tenantId: string,
  supplierProductId: string
): Promise<ScrapeResult> {
  const product = await prisma.supplierProduct.findFirst({
    where: {
      id: supplierProductId,
      deletedAt: null,
      supplier: { tenantId, deletedAt: null },
    },
  });
  if (!product) throw new Error(`SupplierProduct ${supplierProductId} not found`);
  if (!product.externalUrl) {
    throw new Error(`SupplierProduct ${supplierProductId} has no externalUrl to scrape`);
  }

  const scraper = getScraperForUrl(product.externalUrl);
  const scraped = await scraper.scrape(product.externalUrl);

  const previousPrice = product.referencePrice;
  const newPrice = scraped.price ?? previousPrice;
  const changed = newPrice !== previousPrice;
  const scrapedAt = new Date();

  await prisma.supplierProduct.update({
    where: { id: supplierProductId },
    data: {
      referencePrice: newPrice,
      lastScrapedAt: scrapedAt,
      metadata: {
        ...(product.metadata as Record<string, unknown>),
        lastScrapedName: scraped.name,
        lastScrapedCurrency: scraped.currency,
      },
    },
  });

  return {
    supplierProductId,
    previousPrice,
    newPrice,
    changed,
    scrapedAt: scrapedAt.toISOString(),
  };
}

/**
 * Scrape all active products for a given supplier.
 * Products without an externalUrl are skipped.
 */
export async function scrapeAllSupplierProducts(
  tenantId: string,
  supplierId: string
): Promise<ScrapeResult[]> {
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, tenantId, deletedAt: null },
  });
  if (!supplier) throw new Error(`Supplier ${supplierId} not found`);

  const products = await prisma.supplierProduct.findMany({
    where: { supplierId, deletedAt: null },
  });

  const results: ScrapeResult[] = [];
  for (const product of products) {
    if (!product.externalUrl) continue;
    try {
      const result = await scrapeSupplierProduct(tenantId, product.id);
      results.push(result);
    } catch (err) {
      console.error(
        `[supplier-scraper] Failed to scrape product ${product.id}:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  return results;
}

// ─── Phase 5: per-user credentialed scraping & reference price ─────────────────

/**
 * Recompute the referencePrice for a supplier product as the MAX of all
 * SupplierPriceRecord rows for that product (across all tenants).
 */
export async function recomputeReferencePrice(supplierProductId: string): Promise<void> {
  const records = await prisma.supplierPriceRecord.findMany({
    where: { supplierProductId },
    select: { observedPrice: true },
  });

  if (records.length === 0) return;

  const maxPrice = Math.max(...records.map((r) => r.observedPrice));

  await prisma.supplierProduct.update({
    where: { id: supplierProductId },
    data: {
      referencePrice: maxPrice,
      lastScrapedAt: new Date(),
    },
  });
}

/**
 * Scrape only the supplier products that are used in the given tenant's recipes,
 * using the user's registered credentials for each supplier.
 *
 * Algorithm:
 *   1. Find all active credentials for the user in this tenant.
 *   2. Find all supplier products linked to ingredients used in this tenant's recipes.
 *   3. For each product whose supplier has a credential, do a credentialed scrape.
 *   4. Append a SupplierPriceRecord row (one per scrape — full history preserved).
 *   5. Recompute referencePrice for each scraped product.
 */
export async function scrapeForUser(
  tenantId: string,
  userId: string
): Promise<UserScrapeRunResult> {
  // 1. Load active credentials for this user
  const credentials = await prisma.supplierCredential.findMany({
    where: { tenantId, userId, deletedAt: null, isActive: true },
    select: { id: true, supplierId: true, loginUrl: true, username: true, passwordEnc: true },
  });

  const credBySupplierId = new Map(credentials.map((c) => [c.supplierId, c]));
  if (credBySupplierId.size === 0) {
    return { userId, scraped: 0, skipped: 0, failed: 0, results: [] };
  }

  // 2. Find supplier products linked to ingredients used in any recipe in this tenant.
  const linkedProducts = await prisma.supplierProduct.findMany({
    where: {
      deletedAt: null,
      externalUrl: { not: null },
      supplierId: { in: [...credBySupplierId.keys()] },
      ingredientLinks: {
        some: {
          ingredient: {
            tenantId,
            deletedAt: null,
            recipeIngredients: {
              some: {
                recipe: { tenantId, deletedAt: null },
              },
            },
          },
        },
      },
    },
    select: { id: true, name: true, supplierId: true, externalUrl: true },
  });

  const results: UserScrapeResult[] = [];
  let skipped = 0;
  let failed = 0;

  for (const product of linkedProducts) {
    if (!product.externalUrl) {
      skipped++;
      continue;
    }

    const credential = credBySupplierId.get(product.supplierId);
    if (!credential) {
      skipped++;
      continue;
    }

    try {
      const decrypted = await getDecryptedCredential(credential.id);

      const scraped = await credentialedScraper.scrapeWithCredential(product.externalUrl, {
        loginUrl: decrypted.loginUrl,
        username: decrypted.username,
        password: decrypted.password,
      });

      if (scraped.price === null) {
        skipped++;
        continue;
      }

      const scrapedAt = new Date();

      // Fetch the most recent observation for this tenant + product (to track change)
      const previousRecord = await prisma.supplierPriceRecord.findFirst({
        where: { supplierProductId: product.id, tenantId },
        orderBy: { observedAt: "desc" },
        select: { observedPrice: true },
      });

      // Append a new price record (no upsert — every observation is preserved)
      await prisma.supplierPriceRecord.create({
        data: {
          supplierProductId: product.id,
          tenantId,
          observedPrice: scraped.price,
          source: "SCRAPED",
          credentialId: credential.id,
          observedAt: scrapedAt,
        },
      });

      // Recompute reference price (max across all tenants)
      await recomputeReferencePrice(product.id);

      const updatedProduct = await prisma.supplierProduct.findFirst({
        where: { id: product.id },
        select: { referencePrice: true },
      });

      results.push({
        supplierProductId: product.id,
        supplierProductName: product.name,
        observedPrice: scraped.price,
        previousObservedPrice: previousRecord?.observedPrice ?? null,
        newReferencePrice: updatedProduct?.referencePrice ?? scraped.price,
        scrapedAt: scrapedAt.toISOString(),
      });
    } catch (err) {
      console.error(
        `[supplier-scraper] Failed credentialed scrape for product ${product.id} user ${userId}:`,
        err instanceof Error ? err.message : String(err)
      );
      failed++;
    }
  }

  return {
    userId,
    scraped: results.length,
    skipped,
    failed,
    results,
  };
}

/**
 * Trigger scraping for all users who have credentials covering a specific product,
 * then recompute the reference price. Useful for admin-triggered reconciliation.
 */
export async function scrapeAllUsersForProduct(
  tenantId: string,
  supplierProductId: string
): Promise<{ userCount: number; newReferencePrice: number }> {
  const product = await prisma.supplierProduct.findFirst({
    where: { id: supplierProductId, deletedAt: null, supplier: { tenantId, deletedAt: null } },
    select: { id: true, supplierId: true, externalUrl: true },
  });
  if (!product) throw new Error(`SupplierProduct ${supplierProductId} not found`);
  if (!product.externalUrl) {
    throw new Error(`SupplierProduct ${supplierProductId} has no externalUrl to scrape`);
  }

  // Find all active credentials for suppliers of this product
  const credentials = await prisma.supplierCredential.findMany({
    where: { tenantId, supplierId: product.supplierId, deletedAt: null, isActive: true },
    select: { id: true, userId: true },
  });

  const userIds = [...new Set(credentials.map((c) => c.userId))];

  for (const userId of userIds) {
    try {
      await scrapeForUser(tenantId, userId);
    } catch (err) {
      console.error(
        `[supplier-scraper] scrapeForUser failed for user ${userId}:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  const updated = await prisma.supplierProduct.findFirst({
    where: { id: supplierProductId },
    select: { referencePrice: true },
  });

  return { userCount: userIds.length, newReferencePrice: updated?.referencePrice ?? 0 };
}

/**
 * Return reference price information for a supplier product.
 */
export async function getReferencePriceInfo(
  tenantId: string,
  supplierProductId: string
): Promise<ReferencePriceInfo> {
  const product = await prisma.supplierProduct.findFirst({
    where: { id: supplierProductId, deletedAt: null, supplier: { tenantId, deletedAt: null } },
    select: {
      id: true,
      referencePrice: true,
      lastScrapedAt: true,
    },
  });
  if (!product) throw new Error(`SupplierProduct ${supplierProductId} not found`);

  const priceRecordCount = await prisma.supplierPriceRecord.count({
    where: { supplierProductId },
  });

  return {
    supplierProductId: product.id,
    referencePrice: product.referencePrice,
    lastScrapedAt: product.lastScrapedAt?.toISOString() ?? null,
    priceRecordCount,
  };
}

// Keep backward-compatible alias
export { getReferencePriceInfo as getBasePriceInfo };
