/**
 * Supplier Scraper registry — Phase 4 + E.
 *
 * Returns the appropriate scraper for a given URL.
 * Domain-specific adapters are checked first; GenericScraper is the fallback.
 */
import type { SupplierScraper } from "./base";
import { GenericScraper } from "./generic";
import { FoodstuffsScraper } from "./adapters/foodstuffs";
import { CountdownScraper } from "./adapters/countdown";
import { BifoldScraper } from "./adapters/bifold";
import { ServiceFoodScraper } from "./adapters/service-food";
import { AnchorScraper } from "./adapters/anchor";

const scrapers: SupplierScraper[] = [
  new FoodstuffsScraper(),
  new CountdownScraper(),
  new BifoldScraper(),
  new ServiceFoodScraper(),
  new AnchorScraper(),
  // Add more domain-specific scrapers here before GenericScraper.
];

const genericScraper = new GenericScraper();

export function getScraperForUrl(url: string): SupplierScraper {
  for (const scraper of scrapers) {
    if (scraper.canHandle(url)) return scraper;
  }
  return genericScraper;
}

export { type SupplierScraper } from "./base";
export type { ScrapedProduct, SessionContext, SupplierCredentialPayload } from "./base";
