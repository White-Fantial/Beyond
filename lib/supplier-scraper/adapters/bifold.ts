/**
 * Bifold NZ Scraper Adapter.
 *
 * Handles product pages from the Bifold NZ trade portal (bifold.co.nz).
 *
 * Implementation notes
 * --------------------
 * The login flow and price-element selectors below are stubs. To finish this
 * adapter, inspect the Bifold trade portal with browser DevTools:
 *
 *   1. Login request
 *      - Open DevTools → Network tab, then sign in.
 *      - Note the login endpoint URL, HTTP method, and POST body field names
 *        (e.g. `email`, `password`, `_token`).
 *      - Note whether the response returns a redirect + Set-Cookie header or a
 *        JSON payload containing a session / bearer token.
 *      - Check whether a CSRF token must be fetched from the login page first.
 *
 *   2. Product page
 *      - Navigate to any product page after login.
 *      - Right-click the price element → Inspect, and note its CSS selector
 *        (e.g. `span.trade-price`, `[data-price]`).
 *      - Check whether the page is server-rendered HTML or dynamically loaded
 *        via JavaScript (if JS — Playwright may be required).
 *
 *   3. Product listing
 *      - If there is a catalogue / order-guide page that lists all products and
 *        prices in one request, note its URL and structure so that
 *        `fetchProductList()` can be implemented.
 *
 * Replace the stub bodies below once the above information is available.
 */
import type {
  SupplierScraper,
  ScrapedProduct,
  SessionContext,
  SupplierCredentialPayload,
} from "../base";
import { GenericScraper } from "../generic";

const BIFOLD_DOMAINS = ["bifold.co.nz"];

export class BifoldScraper implements SupplierScraper {
  private readonly generic = new GenericScraper();

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return BIFOLD_DOMAINS.some(
        (d) => hostname === d || hostname.endsWith(`.${d}`)
      );
    } catch {
      return false;
    }
  }

  async scrape(url: string): Promise<ScrapedProduct> {
    return this.generic.scrape(url);
  }

  parseProductPage(html: string): ScrapedProduct {
    // TODO: replace with Bifold-specific CSS selector / JSON extraction once
    // the product page structure has been confirmed via DevTools inspection.
    return this.generic.parseHtml(html);
  }

  /**
   * Authenticate with the Bifold trade portal.
   *
   * TODO: replace stub with real implementation:
   *   - GET loginUrl to extract CSRF token (if required)
   *   - POST credentials to loginUrl with correct field names
   *   - Extract and return Set-Cookie / bearer token from response
   */
  async login(credential: SupplierCredentialPayload): Promise<SessionContext> {
    const loginUrl = credential.loginUrl ?? "https://www.bifold.co.nz/login";
    console.info(
      `[BifoldScraper] login stub called for ${loginUrl} — not yet implemented`
    );
    return { loginUrl, username: credential.username, authenticated: false };
  }

  /**
   * Fetch the authenticated product catalogue.
   *
   * TODO: replace stub with real implementation:
   *   - Use session cookie / token from login() to request the catalogue page
   *     or the supplier's internal product-list API endpoint.
   *   - Parse each product row/card and return a ScrapedProduct per item.
   */
  async fetchProductList(_session: SessionContext): Promise<ScrapedProduct[]> {
    console.info(
      `[BifoldScraper] fetchProductList stub called — not yet implemented`
    );
    return [];
  }
}
