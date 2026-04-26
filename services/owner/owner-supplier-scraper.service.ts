/**
 * Owner Supplier Scraper Service — Cost Management Phase 4, 5, & D.
 *
 * Phase 4: Fetches current prices from supplier product URLs and updates the database.
 * Phase 5: Per-user credentialed scraping and reference-price computation.
 * Phase D: Platform-level scheduled scraping — stores observations under PLATFORM_SCRAPER_TENANT_ID.
 *
 * Reference price logic:
 *   Each user's credential is used to scrape their in-use supplier products.
 *   Observed prices are stored as SupplierPriceRecord rows (append-only, per-tenant).
 *   The platform scraper (no credentials) stores its observations under PLATFORM_SCRAPER_TENANT_ID.
 *   The most recent platform-scraped price is used as a fallback for owners without credentials.
 */
import { prisma } from "@/lib/prisma";
import { getScraperForSupplier } from "@/lib/supplier-scraper";
import type { SupplierScraper, SessionContext, ScrapedProduct } from "@/lib/supplier-scraper/base";
import { credentialedScraper } from "@/lib/supplier-scraper/credentialed";
import { getDecryptedCredential } from "./owner-supplier-credentials.service";
import type { ScrapeResult } from "@/types/owner-suppliers";
import type { UserScrapeResult, UserScrapeRunResult, ReferencePriceInfo } from "@/types/owner-supplier-credentials";

/** Decrypted credential fields used in the session cache. */
interface DecryptedCredentialFields {
  loginUrl: string | null;
  username: string;
  password: string;
}

/** One entry in the per-supplier session cache built by scrapeForUser. */
type SupplierSessionEntry =
  | { session: SessionContext; scraper: SupplierScraper; credentialId: string; decryptedCredential: DecryptedCredentialFields }
  | null;

/** Minimal supplier info needed for scraper resolution. */
interface SupplierAdapterInfo {
  adapterType: string | null;
}

/** Sentinel tenantId used for platform-level (unauthenticated) price observations. */
export const PLATFORM_SCRAPER_TENANT_ID = "PLATFORM_SCRAPER";

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
      supplier: {
        deletedAt: null,
        OR: [{ scope: "PLATFORM" }, { tenantId }],
      },
    },
    include: { supplier: { select: { adapterType: true } } },
  });
  if (!product) throw new Error(`SupplierProduct ${supplierProductId} not found`);
  if (!product.externalUrl) {
    throw new Error(`SupplierProduct ${supplierProductId} has no externalUrl to scrape`);
  }

  const supplierInfo = (product as typeof product & { supplier: SupplierAdapterInfo }).supplier;
  const scraper = getScraperForSupplier(supplierInfo, product.externalUrl);
  if (!scraper) {
    throw new Error(`SupplierProduct ${supplierProductId} has no scraper configured`);
  }

  if (!scraper.scrape) {
    throw new Error(
      `Scraper for product ${supplierProductId} does not support unauthenticated scraping. Use scrapeForUser() instead.`
    );
  }
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
    where: {
      id: supplierId,
      deletedAt: null,
      OR: [{ scope: "PLATFORM" }, { tenantId }],
    },
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
 * Recompute the referencePrice for a supplier product.
 * Uses the most recent platform-scraped price record (tenantId = PLATFORM_SCRAPER_TENANT_ID).
 * Falls back to the most recent price record across all tenants if no platform record exists.
 */
export async function recomputeReferencePrice(supplierProductId: string): Promise<void> {
  // Prefer the latest platform-scraped price as the reference
  const platformRecord = await prisma.supplierPriceRecord.findFirst({
    where: { supplierProductId, tenantId: PLATFORM_SCRAPER_TENANT_ID },
    orderBy: { observedAt: "desc" },
    select: { observedPrice: true },
  });

  if (platformRecord) {
    await prisma.supplierProduct.update({
      where: { id: supplierProductId },
      data: { referencePrice: platformRecord.observedPrice, lastScrapedAt: new Date() },
    });
    return;
  }

  // Fallback: latest record from any tenant
  const anyRecord = await prisma.supplierPriceRecord.findFirst({
    where: { supplierProductId },
    orderBy: { observedAt: "desc" },
    select: { observedPrice: true },
  });

  if (anyRecord) {
    await prisma.supplierProduct.update({
      where: { id: supplierProductId },
      data: { referencePrice: anyRecord.observedPrice, lastScrapedAt: new Date() },
    });
  }
}

/**
 * Scrape only the supplier products linked to active ingredients for the given tenant,
 * using the user's registered credentials for each supplier.
 *
 * Algorithm:
 *   1. Find all active credentials for the user in this tenant.
 *   2. Find all supplier products linked to active ingredient selections for this tenant.
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
 
  // 2. Find supplier products linked to active ingredient selections for this tenant.
  const linkedProducts = await prisma.supplierProduct.findMany({
    where: {
      deletedAt: null,
      supplierId: { in: [...credBySupplierId.keys()] },
      ingredientLinks: {
        some: {
          ingredient: {
            deletedAt: null,
            tenantSelections: {
              some: {
                tenantId,
                isActive: true,
              },
            },
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      supplierId: true,
      externalUrl: true,
      supplier: { select: { adapterType: true } },
    },
  });

  const results: UserScrapeResult[] = [];
  let skipped = 0;
  let failed = 0;

  // 3. Build a per-supplier session cache so each supplier credential is
  //    authenticated at most once, no matter how many products it covers.
  //    Keys are supplierId; values are a SupplierSessionEntry or null (login failed).
  const sessionCache = new Map<string, SupplierSessionEntry>();

  for (const product of linkedProducts) {
    const supplierInfo = (product as typeof product & { supplier: SupplierAdapterInfo }).supplier;
    const domainScraper = getScraperForSupplier(supplierInfo, product.externalUrl);
    if (!domainScraper) {
      console.warn(`[scrapeForUser] no scraper found for productId=${product.id} — skipping`);
      skipped++;
      continue;
    }

    const credential = credBySupplierId.get(product.supplierId);
    if (!credential) {
      console.warn(`[scrapeForUser] no credential found for supplierId=${product.supplierId} — skipping`);
      skipped++;
      continue;
    }

    try {
      // Reuse the session established earlier for this supplier, or create one now.
      let entry: SupplierSessionEntry;
      if (sessionCache.has(product.supplierId)) {
        entry = sessionCache.get(product.supplierId)!;
      } else {
        const decrypted = await getDecryptedCredential(credential.id);

        if (domainScraper.login && domainScraper.scrapeWithSession) {
          const session = await domainScraper.login({
            loginUrl: decrypted.loginUrl ?? undefined,
            username: decrypted.username,
            password: decrypted.password,
          });
          entry = session.authenticated
            ? { session, scraper: domainScraper, credentialId: credential.id, decryptedCredential: decrypted }
            : null;
        } else {
          // Scraper does not support authenticated API sessions — record a
          // sentinel so the generic fallback is used for all products.
          entry = { session: { authenticated: false }, scraper: domainScraper, credentialId: credential.id, decryptedCredential: decrypted };
        }
        sessionCache.set(product.supplierId, entry);
      }

      if (entry === null) {
        // Login failed for this supplier — skip all its products.
        console.warn(`[scrapeForUser] login failed for supplierId=${product.supplierId} — skipping product ${product.id}`);
        skipped++;
        continue;
      }

      let scraped: ScrapedProduct;

      if (entry.scraper.scrapeWithSession && entry.session.authenticated) {
        // Authenticated API path: reuse the existing session.
        // Some scrapers don't need a URL (they use the session's cached product list),
        // but we still guard against a missing URL for scrapers that do.
        if (!product.externalUrl && !entry.scraper.fetchProductList) {
          console.warn(`[scrapeForUser] productId=${product.id} has no externalUrl and scraper has no fetchProductList — skipping`);
          skipped++;
          continue;
        }
        scraped = await entry.scraper.scrapeWithSession(product.externalUrl ?? "", entry.session);
      } else if (product.externalUrl) {
        // Generic form-based fallback (scraper has no scrapeWithSession).
        scraped = await credentialedScraper.scrapeWithCredential(product.externalUrl, {
          loginUrl: entry.decryptedCredential.loginUrl,
          username: entry.decryptedCredential.username,
          password: entry.decryptedCredential.password,
        });
      } else {
        console.warn(`[scrapeForUser] productId=${product.id} no externalUrl and no scrapeWithSession — skipping`);
        skipped++;
        continue;
      }

      if (scraped.price === null) {
        console.warn(`[scrapeForUser] productId=${product.id} scraped price is null — skipping`);
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
          credentialId: entry.credentialId,
          observedAt: scrapedAt,
        },
      });

      // Recompute reference price
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
    where: {
      id: supplierProductId,
      deletedAt: null,
      supplier: {
        deletedAt: null,
        OR: [{ scope: "PLATFORM" }, { tenantId }],
      },
    },
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
    where: {
      id: supplierProductId,
      deletedAt: null,
      supplier: {
        deletedAt: null,
        OR: [{ scope: "PLATFORM" }, { tenantId }],
      },
    },
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

// ─── Phase D: platform-level scheduled scraping ────────────────────────────────

/**
 * Scrape ALL PLATFORM supplier products (unauthenticated).
 * Price observations are stored under PLATFORM_SCRAPER_TENANT_ID.
 * The referencePrice on each product is updated to the latest scraped value.
 *
 * Designed for use in cron jobs — returns a summary of the scrape run.
 */
export async function scrapeAllPlatformProducts(): Promise<{
  total: number;
  scraped: number;
  changed: number;
  failed: number;
}> {
  const platformTenant = await prisma.tenant.findFirst({
    where: { type: "PLATFORM", archivedAt: null },
    select: { id: true },
  });
  if (!platformTenant) {
    throw new Error("Platform tenant not found");
  }

  const platformCredentials = await prisma.supplierCredential.findMany({
    where: { tenantId: platformTenant.id, deletedAt: null, isActive: true },
    select: {
      id: true,
      supplierId: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });
  const credentialBySupplierId = new Map(platformCredentials.map((credential) => [credential.supplierId, credential]));

  const products = await prisma.supplierProduct.findMany({
    where: {
      deletedAt: null,
      supplier: { scope: "PLATFORM", deletedAt: null },
    },
    select: {
      id: true,
      supplierId: true,
      externalUrl: true,
      referencePrice: true,
      supplier: { select: { adapterType: true } },
    },
  });

  let scraped = 0;
  let changed = 0;
  let failed = 0;
  const scrapedAt = new Date();
  const sessionCache = new Map<string, SupplierSessionEntry>();

  for (const product of products) {
    const supplierInfo = (product as typeof product & { supplier: SupplierAdapterInfo }).supplier;
    const scraper = getScraperForSupplier(supplierInfo, product.externalUrl);
    if (!scraper) continue;
    // For scrapers that need a URL, require externalUrl to be present.
    if (!product.externalUrl && !scraper.fetchProductList) continue;
    try {
      const credential = credentialBySupplierId.get(product.supplierId);
      let result: ScrapedProduct | null = null;

      if (credential) {
        let entry = sessionCache.get(product.supplierId);

        if (entry === undefined) {
          const decrypted = await getDecryptedCredential(credential.id);

          try {
            if (scraper.login && scraper.scrapeWithSession) {
              const session = await scraper.login({
                loginUrl: decrypted.loginUrl ?? undefined,
                username: decrypted.username,
                password: decrypted.password,
              });
              entry = session
                ? {
                    session,
                    scraper,
                    credentialId: credential.id,
                    decryptedCredential: decrypted,
                  }
                : null;
            } else {
              entry = {
                session: { authenticated: false },
                scraper,
                credentialId: credential.id,
                decryptedCredential: decrypted,
              };
            }
          } catch {
            entry = null;
          }

          sessionCache.set(product.supplierId, entry);
        }

        if (entry) {
          if (entry.scraper.scrapeWithSession && entry.session.authenticated) {
            result = await entry.scraper.scrapeWithSession(product.externalUrl ?? "", entry.session);
          } else if (product.externalUrl) {
            result = await credentialedScraper.scrapeWithCredential(product.externalUrl, {
              loginUrl: entry.decryptedCredential.loginUrl,
              username: entry.decryptedCredential.username,
              password: entry.decryptedCredential.password,
            });
          }
        }
      }

      if (!result) {
        result = await scraper.scrape(product.externalUrl ?? "");
      }

      if (result.price === null) continue;

      const priceChanged = result.price !== product.referencePrice;

      await prisma.supplierPriceRecord.create({
        data: {
          supplierProductId: product.id,
          tenantId: PLATFORM_SCRAPER_TENANT_ID,
          observedPrice: result.price,
          source: "SCRAPED",
          observedAt: scrapedAt,
        },
      });

      await prisma.supplierProduct.update({
        where: { id: product.id },
        data: { referencePrice: result.price, lastScrapedAt: scrapedAt },
      });

      scraped++;
      if (priceChanged) changed++;
    } catch (err) {
      console.error(
        `[platform-scraper] Failed to scrape product ${product.id}:`,
        err instanceof Error ? err.message : String(err)
      );
      failed++;
    }
  }

  return { total: products.length, scraped, changed, failed };
}

/**
 * Scrape credentialed prices for ALL tenants that have active credentials.
 * Designed for use in cron jobs.
 */
export async function scrapeAllTenantsCredentialed(): Promise<{
  tenants: number;
  totalScraped: number;
  totalFailed: number;
}> {
  const credentials = await prisma.supplierCredential.findMany({
    where: { deletedAt: null, isActive: true },
    select: { tenantId: true, userId: true },
    distinct: ["tenantId", "userId"],
  });

  let totalScraped = 0;
  let totalFailed = 0;
  const tenantUserPairs = credentials.map((c) => ({ tenantId: c.tenantId, userId: c.userId }));

  for (const { tenantId, userId } of tenantUserPairs) {
    try {
      const result = await scrapeForUser(tenantId, userId);
      totalScraped += result.scraped;
      totalFailed += result.failed;
    } catch (err) {
      console.error(
        `[credentialed-scraper] Failed for tenant ${tenantId} user ${userId}:`,
        err instanceof Error ? err.message : String(err)
      );
      totalFailed++;
    }
  }

  const uniqueTenants = new Set(tenantUserPairs.map((p) => p.tenantId)).size;
  return { tenants: uniqueTenants, totalScraped, totalFailed };
}
