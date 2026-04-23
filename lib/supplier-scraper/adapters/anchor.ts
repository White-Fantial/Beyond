/**
 * Anchor Orders Scraper Adapter.
 *
 * Handles authenticated product catalogue retrieval from the Anchor Orders
 * trade portal (webservices.anchororders.com).
 *
 * Authentication:
 *   POST https://webservices.anchororders.com/token
 *   Content-Type: application/x-www-form-urlencoded
 *   Body: username={USERNAME}&password={PASSWORD}&grant_type=password
 *
 *   Response includes:
 *     - access_token / token_type / expires_in / refresh_token
 *     - Session context: StoreUID, OrgUID, DistributionChannelUID,
 *       FranchiseeOrgUID, StoreCode, StoreNumber, StoreName, StoreEmail
 *
 * Product Catalogue:
 *   POST https://webservices.anchororders.com/api//ProductGroup/GetProductListByProductGroupCode?groupcode={GROUP_CODE}
 *   Authorization: Bearer {access_token}
 *   Body: { PromoMCL, Category, SubCategory, ProductGroup, BannerUID,
 *           IsFromBanner, GlobalSearch, StoreUID, OrgUID,
 *           DistributionChannelUID, FranchiseeOrgUID }
 *
 *   Response: Data.ProductCatalogueItem[] — each item identified by Code.
 *   Multiple group codes must be queried; duplicates are deduplicated by Code.
 *
 * Image URLs:
 *   ImageURL is a relative path — normalised to an absolute URL by prepending
 *   https://webservices.anchororders.com.
 */
import type {
  SupplierScraper,
  ScrapedProduct,
  SessionContext,
  SupplierCredentialPayload,
} from "../base";
import { GenericScraper } from "../generic";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ANCHOR_API_BASE = "https://webservices.anchororders.com";
const TOKEN_URL = `${ANCHOR_API_BASE}/token`;
// Note: the double slash (/api//ProductGroup) is as specified in the Anchor
// Orders API documentation and must be preserved exactly.
const CATALOG_URL_TEMPLATE = `${ANCHOR_API_BASE}/api//ProductGroup/GetProductListByProductGroupCode`;
const IMAGE_BASE_URL = ANCHOR_API_BASE;

/** Domains whose URLs are handled by this adapter. */
const ANCHOR_DOMAINS = [
  "webservices.anchororders.com",
  "anchororders.com",
  "anchorfoodprofessionals.com",
  "anchorfoodprofessionals.co.nz",
  "fonterra.com",
];

/**
 * Known product group codes.  All must be queried to build the full catalogue;
 * responses from different codes may overlap (deduplication is by Code).
 */
const KNOWN_GROUP_CODES = ["FWMA", "FLV", "TPND", "CHE", "BUT", "CUL"];

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const REQUEST_TIMEOUT_MS = 20_000;

// ---------------------------------------------------------------------------
// TypeScript interfaces — Anchor API response shapes
// ---------------------------------------------------------------------------

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  ".issued": string;
  ".expires": string;
  // Session context fields embedded in the token response
  StoreUID: string;
  OrgUID: string;
  DistributionChannelUID: string;
  FranchiseeOrgUID: string;
  StoreCode: string;
  StoreNumber: string;
  StoreName: string;
  StoreEmail: string;
}

interface AnchorUOM {
  Code: string;
  Label: string;
  Multiplier: number;
  IsBaseUOM: boolean;
  IsOuterUOM: boolean;
}

interface AnchorCatalogItem {
  Code: string;
  Description: string;
  ImageURL: string;
  Price: number;
  ViewPrice: number;
  SelectedUOM: string;
  IsAvailable: boolean;
  IsBlocked: boolean;
  IsPromotion: boolean;
  NotAvailableReasonCode: string;
  CategoryCode: string;
  SubCategoryCode: string;
  SAPProductGroupCode: string;
  MinOrderQty: number;
  IsMinOrderSelected: boolean;
  IsOnlyOuterAllowed: boolean;
  IsThirdPartySKU: boolean;
  Conversion: string;
  lstUOM: AnchorUOM[];
}

interface CatalogResponse {
  Data: {
    ProductCatalogueItem: AnchorCatalogItem[];
  };
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Normalise a relative Anchor image path to an absolute URL.
 * Handles both "/Data/SKU/image.jpg" and "Data/SKU/image.jpg" forms.
 * Returns null for empty or already-absolute URLs that don't belong to the
 * Anchor domain.
 */
function normalizeImageUrl(imageUrl: string): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  const path = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
  return `${IMAGE_BASE_URL}${path}`;
}

/**
 * Extract the Anchor product Code from a product URL.
 *
 * Anchor products do not have individual browseable pages; however, the
 * platform stores a canonical URL in the form:
 *   https://webservices.anchororders.com/products/{CODE}
 *
 * The Code is the last non-empty path segment. Returns null if no meaningful
 * segment can be extracted.
 */
function extractProductCodeFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const segments = u.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    return last ?? null;
  } catch {
    return null;
  }
}

/**
 * Convert an NZD dollar price from the Anchor API to millicents
 * (the platform's internal monetary unit: 1/100,000 of a dollar).
 * Returns null if the value is not a valid non-negative number.
 */
function priceToMillicents(price: number): number | null {
  if (!isFinite(price) || price < 0) return null;
  return Math.round(price * 100_000);
}

/**
 * Map a single AnchorCatalogItem to a ScrapedProduct.
 * Extra Anchor-specific fields (externalId, imageUrl) are carried through
 * as additional properties on the returned object.
 */
function mapCatalogItem(item: AnchorCatalogItem): ScrapedProduct & {
  externalId: string;
  imageUrl: string | null;
} {
  return {
    name: item.Description || null,
    price: priceToMillicents(item.Price),
    currency: "NZD",
    unit: item.SelectedUOM || null,
    externalId: item.Code,
    imageUrl: normalizeImageUrl(item.ImageURL),
  };
}

// ---------------------------------------------------------------------------
// AnchorScraper
// ---------------------------------------------------------------------------

export class AnchorScraper implements SupplierScraper {
  private readonly generic = new GenericScraper();

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return ANCHOR_DOMAINS.some(
        (d) => hostname === d || hostname.endsWith(`.${d}`)
      );
    } catch {
      return false;
    }
  }

  async scrape(url: string): Promise<ScrapedProduct> {
    // Anchor has no per-product browseable URL — fall back to generic HTML.
    return this.generic.scrape(url);
  }

  parseProductPage(html: string): ScrapedProduct {
    return this.generic.parseHtml(html);
  }

  /**
   * Authenticate with the Anchor Orders API using resource-owner password
   * credentials grant (application/x-www-form-urlencoded).
   *
   * On success the returned SessionContext contains:
   *   authenticated: true
   *   accessToken   — Bearer token for subsequent requests
   *   refreshToken
   *   StoreUID, OrgUID, DistributionChannelUID, FranchiseeOrgUID
   *   StoreCode, StoreNumber, StoreName, StoreEmail
   */
  async login(credential: SupplierCredentialPayload): Promise<SessionContext> {
    const body = new URLSearchParams({
      username: credential.username,
      password: credential.password,
      grant_type: "password",
    });

    let res: Response;
    try {
      res = await fetch(TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": DEFAULT_USER_AGENT,
        },
        body: body.toString(),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      console.error(
        `[AnchorScraper] login request failed: ${err instanceof Error ? err.message : String(err)}`
      );
      return { username: credential.username, authenticated: false };
    }

    if (!res.ok) {
      console.error(`[AnchorScraper] login returned HTTP ${res.status}`);
      return { username: credential.username, authenticated: false };
    }

    let data: TokenResponse;
    try {
      data = (await res.json()) as TokenResponse;
    } catch {
      console.error(`[AnchorScraper] login response is not valid JSON`);
      return { username: credential.username, authenticated: false };
    }

    if (!data.access_token) {
      console.error(`[AnchorScraper] login response missing access_token`);
      return { username: credential.username, authenticated: false };
    }

    return {
      username: credential.username,
      authenticated: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      StoreUID: data.StoreUID,
      OrgUID: data.OrgUID,
      DistributionChannelUID: data.DistributionChannelUID,
      FranchiseeOrgUID: data.FranchiseeOrgUID,
      StoreCode: data.StoreCode,
      StoreNumber: data.StoreNumber,
      StoreName: data.StoreName,
      StoreEmail: data.StoreEmail,
    };
  }

  /**
   * Scrape a single product using an already-established authenticated session.
   *
   * Because the Anchor Orders API has no per-product detail endpoint, this
   * method queries each known product group in order and returns the first item
   * whose Code matches the code extracted from `url`.
   *
   * The canonical `externalUrl` format for Anchor products is:
   *   https://webservices.anchororders.com/products/{CODE}
   * where CODE is the Anchor product Code (e.g. "FWMA1234").
   *
   * Returns an empty ScrapedProduct if the product cannot be found.
   */
  async scrapeWithSession(
    url: string,
    session: SessionContext
  ): Promise<ScrapedProduct> {
    const empty: ScrapedProduct = { name: null, price: null, currency: null, unit: null };

    if (!session.authenticated || !session.accessToken) {
      console.warn("[AnchorScraper] scrapeWithSession called without a valid session");
      return empty;
    }

    const productCode = extractProductCodeFromUrl(url);
    if (!productCode) {
      console.warn(`[AnchorScraper] scrapeWithSession: could not extract product code from URL: ${url}`);
      return empty;
    }

    // Search each product group until the matching code is found.
    for (const groupCode of KNOWN_GROUP_CODES) {
      const items = await this.fetchGroupProducts(groupCode, session);
      const match = items.find((item) => item.Code === productCode);
      if (match) {
        const mapped = mapCatalogItem(match);
        // Return only the ScrapedProduct fields (strip externalId/imageUrl extras).
        return {
          name: mapped.name,
          price: mapped.price,
          currency: mapped.currency,
          unit: mapped.unit,
        };
      }
    }

    console.warn(`[AnchorScraper] scrapeWithSession: product code ${productCode} not found in any group`);
    return empty;
  }

  /**
   * Fetch the full authenticated product catalogue by querying all known
   * product group codes and deduplicating results by Code.
   *
   * Products that appear in multiple group responses are represented only once
   * (first occurrence wins).
   */
  async fetchProductList(session: SessionContext): Promise<ScrapedProduct[]> {
    if (!session.authenticated || !session.accessToken) {
      console.warn(
        `[AnchorScraper] fetchProductList called without a valid session`
      );
      return [];
    }

    const seen = new Map<string, ScrapedProduct>();

    for (const groupCode of KNOWN_GROUP_CODES) {
      const items = await this.fetchGroupProducts(groupCode, session);
      for (const item of items) {
        if (!seen.has(item.Code)) {
          seen.set(item.Code, mapCatalogItem(item));
        }
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Fetch raw catalog items for a single product group code.
   * Returns an empty array on any network or parse error so that the caller
   * can continue with the remaining group codes.
   */
  private async fetchGroupProducts(
    groupCode: string,
    session: SessionContext
  ): Promise<AnchorCatalogItem[]> {
    const url = `${CATALOG_URL_TEMPLATE}?groupcode=${encodeURIComponent(groupCode)}`;

    const requestBody = {
      PromoMCL: [],
      Category: [],
      SubCategory: [],
      ProductGroup: [],
      BannerUID: "",
      IsFromBanner: "No",
      GlobalSearch: "",
      StoreUID: session.StoreUID as string,
      OrgUID: session.OrgUID as string,
      DistributionChannelUID: session.DistributionChannelUID as string,
      FranchiseeOrgUID: session.FranchiseeOrgUID as string,
    };

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken as string}`,
          "User-Agent": DEFAULT_USER_AGENT,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      console.warn(
        `[AnchorScraper] catalog fetch failed for group ${groupCode}: ${err instanceof Error ? err.message : String(err)}`
      );
      return [];
    }

    if (!res.ok) {
      console.warn(
        `[AnchorScraper] catalog group ${groupCode} returned HTTP ${res.status}`
      );
      return [];
    }

    let body: CatalogResponse;
    try {
      body = (await res.json()) as CatalogResponse;
    } catch {
      console.warn(
        `[AnchorScraper] catalog group ${groupCode} response is not valid JSON`
      );
      return [];
    }

    return body.Data?.ProductCatalogueItem ?? [];
  }
}
