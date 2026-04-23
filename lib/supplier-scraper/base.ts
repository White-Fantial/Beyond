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

/** Opaque session context returned by login(), passed to credentialed methods. */
export interface SessionContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/** Credential payload passed to login(). */
export interface SupplierCredentialPayload {
  username: string;
  password: string;
  loginUrl?: string;
}

export interface SupplierScraper {
  /** Returns true if this scraper can handle the given URL. */
  canHandle(url: string): boolean;

  /** Fetches and parses the product page at `url`. */
  scrape(url: string): Promise<ScrapedProduct>;

  /**
   * Authenticate with the supplier and return a session context.
   * Optional — only implemented by scrapers that support authenticated access.
   */
  login?(credential: SupplierCredentialPayload): Promise<SessionContext>;

  /**
   * Fetch the authenticated user's complete product list.
   * Optional — requires a valid session obtained via `login()`.
   */
  fetchProductList?(session: SessionContext): Promise<ScrapedProduct[]>;

  /**
   * Parse a raw HTML product page into a ScrapedProduct.
   * Optional — useful for suppliers where the HTML can be fetched externally.
   */
  parseProductPage?(html: string): ScrapedProduct;

  /**
   * Scrape a product page using an already-established authenticated session.
   * Optional — implemented by scrapers that use a non-HTML API for product data.
   */
  scrapeWithSession?(url: string, session: SessionContext): Promise<ScrapedProduct>;
}
