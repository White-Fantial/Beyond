/**
 * Countdown NZ Scraper Adapter.
 *
 * Handles product pages from countdown.co.nz (Woolworths NZ).
 * Falls back to GenericScraper for individual product pages.
 *
 * Note: Authenticated bulk-price fetching requires valid credentials.
 * The `login()` and `fetchProductList()` methods are stubs — a real implementation
 * would use a headless browser or the Woolworths NZ public API endpoints.
 */
import type {
  SupplierScraper,
  ScrapedProduct,
  SessionContext,
  SupplierCredentialPayload,
} from "../base";
import { GenericScraper } from "../generic";

const COUNTDOWN_DOMAINS = [
  "countdown.co.nz",
  "woolworths.co.nz",
];

export class CountdownScraper implements SupplierScraper {
  private readonly generic = new GenericScraper();

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return COUNTDOWN_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`));
    } catch {
      return false;
    }
  }

  async scrape(url: string): Promise<ScrapedProduct> {
    return this.generic.scrape(url);
  }

  parseProductPage(html: string): ScrapedProduct {
    return this.generic.parseHtml(html);
  }

  /**
   * Authenticate with the Countdown / Woolworths NZ account portal.
   * Stub implementation — replace with real authentication logic.
   */
  async login(credential: SupplierCredentialPayload): Promise<SessionContext> {
    const loginUrl = credential.loginUrl ?? "https://www.countdown.co.nz/account/login";
    console.info(
      `[CountdownScraper] login stub called for ${loginUrl} — not yet implemented`
    );
    return { loginUrl, username: credential.username, authenticated: false };
  }

  /**
   * Fetch the authenticated product catalogue.
   * Stub implementation — replace with real product-list scraping/API logic.
   */
  async fetchProductList(_session: SessionContext): Promise<ScrapedProduct[]> {
    console.info(
      `[CountdownScraper] fetchProductList stub called — not yet implemented`
    );
    return [];
  }
}
