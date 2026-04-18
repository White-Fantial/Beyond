/**
 * Owner Supplier Scraper Service — Cost Management Phase 4.
 *
 * Fetches current prices from supplier product URLs and updates the database.
 * When a preferred link exists between a SupplierProduct and an Ingredient,
 * the ingredient's unitCost is automatically updated if the price changed.
 */
import { prisma } from "@/lib/prisma";
import { getScraperForUrl } from "@/lib/supplier-scraper";
import type { ScrapeResult } from "@/types/owner-suppliers";

// ─── Public functions ─────────────────────────────────────────────────────────

/**
 * Scrape a single supplier product URL and persist the new price.
 * If the product has a preferred ingredient link, the ingredient's
 * unitCost is updated to match the new price.
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

  const previousPrice = product.currentPrice;
  const newPrice = scraped.price ?? previousPrice;
  const changed = newPrice !== previousPrice;
  const scrapedAt = new Date();

  await prisma.supplierProduct.update({
    where: { id: supplierProductId },
    data: {
      currentPrice: newPrice,
      lastScrapedAt: scrapedAt,
      metadata: {
        ...(product.metadata as Record<string, unknown>),
        lastScrapedName: scraped.name,
        lastScrapedCurrency: scraped.currency,
      },
    },
  });

  // Update preferred-linked ingredient unitCost if price changed
  if (changed) {
    const preferredLink = await prisma.ingredientSupplierLink.findFirst({
      where: { supplierProductId, isPreferred: true },
    });
    if (preferredLink) {
      await prisma.ingredient.update({
        where: { id: preferredLink.ingredientId },
        data: { unitCost: newPrice },
      });
    }
  }

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
    } catch {
      // Continue scraping remaining products even if one fails
    }
  }

  return results;
}
