/**
 * Supplier Scraper — base interface.
 *
 * All scrapers implement this interface. Results are normalised so that
 * currentPrice is always in minor currency units (e.g. cents).
 */

export interface ScrapedProduct {
  name: string | null;
  price: number | null; // minor currency units (e.g. cents), or null if not found
  currency: string | null;
  unit: string | null;
}

export interface SupplierScraper {
  /** Returns true if this scraper can handle the given URL. */
  canHandle(url: string): boolean;
  /** Fetches and parses the product page at `url`. */
  scrape(url: string): Promise<ScrapedProduct>;
}
