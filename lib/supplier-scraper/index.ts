/**
 * Supplier Scraper registry — Phase 4.
 *
 * Returns the appropriate scraper for a given URL.
 * Custom scrapers for specific domains can be registered here.
 */
import type { SupplierScraper } from "./base";
import { GenericScraper } from "./generic";

const scrapers: SupplierScraper[] = [
  // Add domain-specific scrapers here before GenericScraper.
  // Example: new FoodstuffsScraper(), new CountdownScraper(), etc.
];

const genericScraper = new GenericScraper();

export function getScraperForUrl(url: string): SupplierScraper {
  for (const scraper of scrapers) {
    if (scraper.canHandle(url)) return scraper;
  }
  return genericScraper;
}

export { type SupplierScraper } from "./base";
export type { ScrapedProduct } from "./base";
