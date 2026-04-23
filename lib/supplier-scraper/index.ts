/**
 * Supplier Scraper registry — Phase 4 + E.
 *
 * Returns the appropriate scraper for a given URL or adapter key.
 * Domain-specific adapters are checked first; GenericScraper is the fallback.
 */
import type { SupplierScraper } from "./base";
import { GenericScraper } from "./generic";
import { FoodstuffsScraper } from "./adapters/foodstuffs";
import { CountdownScraper } from "./adapters/countdown";
import { BifoldScraper } from "./adapters/bifold";
import { ServiceFoodScraper } from "./adapters/service-food";
import { AnchorScraper } from "./adapters/anchor";
import { BidfoodScraper } from "./adapters/bidfood";

const scrapers: SupplierScraper[] = [
  new FoodstuffsScraper(),
  new CountdownScraper(),
  new BifoldScraper(),
  new ServiceFoodScraper(),
  new AnchorScraper(),
  new BidfoodScraper(),
  // Add more domain-specific scrapers here before GenericScraper.
];

const genericScraper = new GenericScraper();

/**
 * Registry mapping adapter keys to scraper instances.
 * Keys are the values stored in `Supplier.adapterType`.
 */
export const SCRAPER_REGISTRY: Record<string, SupplierScraper> = {
  anchor: new AnchorScraper(),
  bidfood: new BidfoodScraper(),
  bifold: new BifoldScraper(),
  "service-food": new ServiceFoodScraper(),
  foodstuffs: new FoodstuffsScraper(),
  countdown: new CountdownScraper(),
};

/** All registered adapter keys, sorted alphabetically. */
export const SCRAPER_ADAPTER_KEYS = Object.keys(SCRAPER_REGISTRY).sort();

export function getScraperForUrl(url: string): SupplierScraper {
  for (const scraper of scrapers) {
    if (scraper.canHandle(url)) return scraper;
  }
  return genericScraper;
}

/**
 * Returns the scraper registered under `adapterType`, or null if not found.
 */
export function getScraperForAdapter(adapterType: string): SupplierScraper | null {
  return SCRAPER_REGISTRY[adapterType] ?? null;
}

/**
 * Resolves the best scraper for a supplier.
 * Priority: adapterType registry → URL-based detection → null.
 */
export function getScraperForSupplier(
  supplier: { adapterType: string | null },
  url?: string | null
): SupplierScraper | null {
  if (supplier.adapterType) {
    const adapter = getScraperForAdapter(supplier.adapterType);
    if (adapter) return adapter;
  }
  if (url) {
    return getScraperForUrl(url);
  }
  return null;
}

export { type SupplierScraper } from "./base";
export type { ScrapedProduct, SessionContext, SupplierCredentialPayload } from "./base";
