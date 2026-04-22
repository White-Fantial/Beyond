/**
 * Foodstuffs NZ Scraper Adapter.
 *
 * Handles product pages from Foodstuffs NZ wholesale portals.
 * Falls back to GenericScraper for individual product pages.
 *
 * Note: Authenticated price fetching requires valid trade-account credentials.
 * The `login()` and `fetchProductList()` methods are stubs — a real implementation
 * would use a headless browser (e.g. Playwright) or the supplier's REST API if
 * one is available under their terms of service.
 */
import type {
  SupplierScraper,
  ScrapedProduct,
  SessionContext,
  SupplierCredentialPayload,
} from "../base";
import { GenericScraper } from "../generic";

const FOODSTUFFS_DOMAINS = [
  "ordering.foodstuffs.co.nz",
  "shop.pns.co.nz",
  "shop.newworld.co.nz",
  "shop.paknsave.co.nz",
];

export class FoodstuffsScraper implements SupplierScraper {
  private readonly generic = new GenericScraper();

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return FOODSTUFFS_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`));
    } catch {
      return false;
    }
  }

  async scrape(url: string): Promise<ScrapedProduct> {
    // Delegate to GenericScraper — handles JSON-LD / OG tags on product pages
    return this.generic.scrape(url);
  }

  parseProductPage(html: string): ScrapedProduct {
    return this.generic.parseHtml(html);
  }

  /**
   * Authenticate with the Foodstuffs trade portal.
   * Returns a session token / cookie string for use in subsequent requests.
   * Stub implementation — replace with real authentication logic.
   */
  async login(credential: SupplierCredentialPayload): Promise<SessionContext> {
    const loginUrl =
      credential.loginUrl ?? "https://ordering.foodstuffs.co.nz/login";
    // Real implementation would POST to the login form and extract session cookies.
    console.info(
      `[FoodstuffsScraper] login stub called for ${loginUrl} — not yet implemented`
    );
    return { loginUrl, username: credential.username, authenticated: false };
  }

  /**
   * Fetch the authenticated product catalogue.
   * Stub implementation — replace with real product-list API/scraping logic.
   */
  async fetchProductList(_session: SessionContext): Promise<ScrapedProduct[]> {
    console.info(
      `[FoodstuffsScraper] fetchProductList stub called — not yet implemented`
    );
    return [];
  }
}
