/**
 * Service Foods Online NZ Scraper Adapter.
 *
 * Handles product pages from the Service Foods Online trade portal
 * (servicefoodsonline.co.nz / servicefoodsonline.kiwi).
 *
 * Authentication:
 *   POST https://api.servicefoodsonline.co.nz/web/auth/v1/login
 *   Body: { emailAddress, password, appKey, channel, registrationToken }
 *   Response: { success, data: { accessToken, refreshToken, ... } }
 *
 * Product search / catalogue:
 *   GET https://api.servicefoodsonline.co.nz/web/catalog/v1/search?keyword=&limit=100&page=1
 *   Header: Authorization: <accessToken>
 *   Response: { success, data: { products: [...] } }
 *
 * Product detail:
 *   GET https://api.servicefoodsonline.co.nz/web/catalog/v1/products/{sku}
 *   Header: Authorization: <accessToken>
 *   Response: { success, data: { productDetail: { name, salePrice, normalPrice, stockUnit, units, ... } } }
 */
import type {
  SupplierScraper,
  ScrapedProduct,
  SessionContext,
  SupplierCredentialPayload,
} from "../base";
import { GenericScraper } from "../generic";

const SERVICE_FOOD_DOMAINS = [
  "servicefoodsonline.co.nz",
  "servicefoodsonline.kiwi",
];

const API_BASE_URL = "https://api.servicefoodsonline.co.nz";
const LOGIN_API_URL = `${API_BASE_URL}/web/auth/v1/login`;
const CATALOG_SEARCH_URL = `${API_BASE_URL}/web/catalog/v1/search`;

// Application key embedded in the Service Foods Online web client.
const APP_KEY = "T3bhwMWrT6wC84qEYynrq9zZ73nZ4wJR";

// Max products per page accepted by the search endpoint.
const CATALOG_PAGE_SIZE = 100;

// Safety cap: stop after this many pages to avoid runaway loops.
const MAX_PAGES = 200;

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

interface LoginResponseData {
  accessToken: string;
  refreshToken: string;
  displayName: string;
  emailAddress: string;
  accountCode: string;
  companyName: string;
}

interface LoginResponse {
  success: boolean;
  data?: LoginResponseData;
}

interface CatalogUnit {
  code: string;
  display: string;
  salePrice: number;
  normalPrice: number;
}

interface CatalogProduct {
  sku: string;
  displayName: string;
  units: CatalogUnit[];
}

interface CatalogSearchResponse {
  success: boolean;
  data?: {
    products: CatalogProduct[];
  };
}

interface ProductDetailData {
  name: string;
  normalPrice: number;
  salePrice: number;
  stockUnit?: string;
  units?: CatalogUnit[];
}

interface ProductDetailResponse {
  success: boolean;
  data?: {
    productDetail: ProductDetailData;
  };
}

const PRODUCT_DETAIL_URL = `${API_BASE_URL}/web/catalog/v1/products`;

/**
 * Convert a dollar-value price from the Service Foods API to millicents
 * (the platform's internal monetary unit: 1/100,000 of a dollar).
 * Returns null if the value is not a valid positive number.
 */
function dollarToMillicents(dollars: number): number | null {
  if (!isFinite(dollars) || dollars < 0) return null;
  return Math.round(dollars * 100_000);
}

/**
 * Map a single CatalogProduct to a ScrapedProduct.
 * Uses the first unit entry (smallest purchasable unit, typically BAG).
 * Price is taken from salePrice; falls back to normalPrice.
 */
function mapCatalogProduct(product: CatalogProduct): ScrapedProduct {
  const unit = product.units[0] ?? null;
  const dollarPrice = unit ? (unit.salePrice ?? unit.normalPrice) : null;
  return {
    name: product.displayName ?? null,
    price: dollarPrice !== null ? dollarToMillicents(dollarPrice) : null,
    currency: "NZD",
    unit: unit ? unit.display : null,
  };
}

/**
 * Extract the product SKU from a Service Foods URL.
 *
 * Handles two formats:
 *   - Product page:  https://www.servicefoodsonline.kiwi/FLOUS20-FLOUR-BETA-STRONG-...
 *     → SKU is the first dash-delimited segment of the path.
 *   - Detail API:    https://api.servicefoodsonline.co.nz/web/catalog/v1/products/FLOUS20
 *     → SKU is the last path segment.
 *
 * Returns null for unrecognised URL formats.
 */
function extractSkuFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "api.servicefoodsonline.co.nz") {
      // API URL: last non-empty path segment is the SKU
      const parts = u.pathname.split("/").filter(Boolean);
      return parts[parts.length - 1] ?? null;
    }
    // Product page URL slug: first segment before the first '-' is the SKU
    const slug = u.pathname.replace(/^\//, "");
    const dashIndex = slug.indexOf("-");
    if (dashIndex > 0) return slug.slice(0, dashIndex);
    return slug || null;
  } catch {
    return null;
  }
}

/**
 * Map a ProductDetailData from the detail API to a ScrapedProduct.
 * Uses salePrice; falls back to normalPrice. Unit comes from stockUnit or first unit entry.
 */
function mapProductDetail(detail: ProductDetailData): ScrapedProduct {
  const dollarPrice = detail.salePrice ?? detail.normalPrice ?? null;
  const unit = detail.stockUnit ?? detail.units?.[0]?.display ?? null;
  return {
    name: detail.name ?? null,
    price: dollarPrice !== null ? dollarToMillicents(dollarPrice) : null,
    currency: "NZD",
    unit,
  };
}

export class ServiceFoodScraper implements SupplierScraper {
  private readonly generic = new GenericScraper();

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return SERVICE_FOOD_DOMAINS.some(
        (d) => hostname === d || hostname.endsWith(`.${d}`)
      );
    } catch {
      return false;
    }
  }

  async scrape(url: string): Promise<ScrapedProduct> {
    const sku = extractSkuFromUrl(url);
    if (!sku) {
      // Unrecognised URL format — fall back to generic HTML scraping
      return this.generic.scrape(url);
    }

    const detailUrl = `${PRODUCT_DETAIL_URL}/${encodeURIComponent(sku)}`;

    let res: Response;
    try {
      res = await fetch(detailUrl, {
        headers: {
          Accept: "application/json;charset=UTF-8",
          "User-Agent": DEFAULT_USER_AGENT,
          Origin: "https://www.servicefoodsonline.kiwi",
        },
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      console.warn(
        `[ServiceFoodScraper] detail fetch failed for SKU ${sku}: ${err instanceof Error ? err.message : String(err)}`
      );
      return { name: null, price: null, currency: null, unit: null };
    }

    if (!res.ok) {
      // 401/403 expected when no auth token is provided — return empty result.
      console.warn(
        `[ServiceFoodScraper] detail returned HTTP ${res.status} for SKU ${sku}`
      );
      return { name: null, price: null, currency: null, unit: null };
    }

    let body: ProductDetailResponse;
    try {
      body = (await res.json()) as ProductDetailResponse;
    } catch {
      return { name: null, price: null, currency: null, unit: null };
    }

    const detail = body.data?.productDetail;
    if (!detail) {
      return { name: null, price: null, currency: null, unit: null };
    }

    return mapProductDetail(detail);
  }

  parseProductPage(html: string): ScrapedProduct {
    // Service Foods Online is a React SPA — HTML pages contain no structured
    // pricing data. Delegate to the generic scraper as a best-effort fallback.
    return this.generic.parseHtml(html);
  }

  /**
   * Authenticate with the Service Foods Online REST API.
   *
   * POSTs JSON credentials to the login endpoint and returns a session context
   * containing the JWT accessToken for use in subsequent authenticated requests.
   */
  async login(credential: SupplierCredentialPayload): Promise<SessionContext> {
    const loginUrl = credential.loginUrl ?? LOGIN_API_URL;

    let res: Response;
    try {
      res = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json;charset=UTF-8",
          "User-Agent": DEFAULT_USER_AGENT,
          Origin: "https://www.servicefoodsonline.kiwi",
        },
        body: JSON.stringify({
          emailAddress: credential.username,
          password: credential.password,
          appKey: APP_KEY,
          channel: "0",
          registrationToken: "",
        }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      console.error(
        `[ServiceFoodScraper] login request failed: ${err instanceof Error ? err.message : String(err)}`
      );
      return { loginUrl, username: credential.username, authenticated: false };
    }

    if (!res.ok) {
      console.error(
        `[ServiceFoodScraper] login returned HTTP ${res.status}`
      );
      return { loginUrl, username: credential.username, authenticated: false };
    }

    let body: LoginResponse;
    try {
      body = (await res.json()) as LoginResponse;
    } catch {
      console.error(`[ServiceFoodScraper] login response is not valid JSON`);
      return { loginUrl, username: credential.username, authenticated: false };
    }

    if (!body.success || !body.data?.accessToken) {
      console.error(`[ServiceFoodScraper] login unsuccessful or missing token`);
      return { loginUrl, username: credential.username, authenticated: false };
    }

    return {
      loginUrl,
      username: credential.username,
      authenticated: true,
      accessToken: body.data.accessToken,
      refreshToken: body.data.refreshToken,
      accountCode: body.data.accountCode,
      companyName: body.data.companyName,
    };
  }

  /**
   * Fetch the complete authenticated product catalogue by paginating through
   * the catalog search endpoint with an empty keyword (returns all products).
   *
   * Each page uses ?keyword=&limit=CATALOG_PAGE_SIZE&page=N.
   * Stops when a page returns fewer products than the page size, or after
   * MAX_PAGES pages as a safety cap.
   */
  async fetchProductList(session: SessionContext): Promise<ScrapedProduct[]> {
    if (!session.authenticated || !session.accessToken) {
      console.warn(
        `[ServiceFoodScraper] fetchProductList called without a valid session`
      );
      return [];
    }

    const results: ScrapedProduct[] = [];
    const token = session.accessToken as string;

    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = new URL(CATALOG_SEARCH_URL);
      url.searchParams.set("keyword", "");
      url.searchParams.set("limit", String(CATALOG_PAGE_SIZE));
      url.searchParams.set("page", String(page));

      let res: Response;
      try {
        res = await fetch(url.toString(), {
          headers: {
            Accept: "application/json;charset=UTF-8",
            Authorization: token,
            "User-Agent": DEFAULT_USER_AGENT,
            Origin: "https://www.servicefoodsonline.kiwi",
          },
          signal: AbortSignal.timeout(20_000),
        });
      } catch (err) {
        console.error(
          `[ServiceFoodScraper] catalog fetch failed on page ${page}: ${err instanceof Error ? err.message : String(err)}`
        );
        break;
      }

      if (!res.ok) {
        console.error(
          `[ServiceFoodScraper] catalog page ${page} returned HTTP ${res.status}`
        );
        break;
      }

      let body: CatalogSearchResponse;
      try {
        body = (await res.json()) as CatalogSearchResponse;
      } catch {
        console.error(
          `[ServiceFoodScraper] catalog page ${page} response is not valid JSON`
        );
        break;
      }

      const products = body.data?.products ?? [];
      for (const product of products) {
        results.push(mapCatalogProduct(product));
      }

      // If this page is not full, we've reached the last page.
      if (products.length < CATALOG_PAGE_SIZE) break;
    }

    return results;
  }
}
