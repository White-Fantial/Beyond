/**
 * Bidfood NZ Scraper Adapter.
 *
 * Handles product pages from the Bidfood NZ trade portal (mybidfood.co.nz).
 *
 * Authentication:
 *   Bidfood uses OpenID Connect (IdentityServer4) with form_post response mode.
 *   The login form embeds several hidden environment fields in addition to the
 *   CSRF token; all must be submitted together with the credentials.
 *
 *   Step 1 — GET the IdentityServer login page:
 *     https://identity.mybidfood.co.nz/core/Account/Login?ReturnUrl=...
 *   Extract:
 *     - All hidden <input> fields (includes __RequestVerificationToken and
 *       environment metadata: BranchGroupId, CustomerGroupId, ShopV5BaseUrl,
 *       HasLogo, Language, SupportMultilingual, PrivacyPolicyEnabled,
 *       LogoFolder, CorporateSiteUrl, Site, StaySignIn, …)
 *     - Set-Cookie headers (anti-forgery cookies)
 *
 *   Step 2 — POST credentials to the same login endpoint (redirect: manual):
 *     Body: all extracted hidden fields + UserName + Password
 *   Response: 302 redirect to /core/connect/authorize/callback?...
 *   Important: Set-Cookie on the 302 response carries idsrv.session and
 *     .AspNetCore.Identity.Application — must be captured before following
 *     the redirect.
 *
 *   Step 3 — GET the authorize/callback URL (from Location header):
 *   Response: HTML page with a self-submitting form that POSTs to signin-oidc
 *     with hidden fields: code, id_token, state, session_state.
 *
 *   Step 4 — POST those hidden fields to signin-oidc (redirect: manual):
 *   Response: 302 + Set-Cookie (final Bidfood shop session cookies).
 *
 *   Step 5 — GET /api/s_v4/Account/GetAccount to obtain the customer AccountId
 *   that must be supplied in subsequent product API calls.
 *
 * Product detail:
 *   GET /api/s_v4/Product/Detail?AccountId={accountId}&ProductCode={code}
 *   Cookie: <session cookies from login>
 *   Price is taken from SelectedUOMPrice.Price (NZD, converted to millicents).
 *
 * Product listing:
 *   fetchProductList() calls GET /api/s_v3/Product/Search/?SearchText=&...
 *   with the session cookies. Paginates using $skip until all products are
 *   retrieved. Each product is normalised to ScrapedProduct with price in
 *   millicents (NZD × 100,000).
 */
import type {
  SupplierScraper,
  ScrapedProduct,
  SessionContext,
  SupplierCredentialPayload,
} from "../base";
import { GenericScraper } from "../generic";

const BIDFOOD_DOMAINS = ["mybidfood.co.nz", "bidfood.co.nz"];

const IDENTITY_BASE = "https://identity.mybidfood.co.nz";
const SHOP_BASE = "https://www.mybidfood.co.nz";

const DEFAULT_LOGIN_URL = `${IDENTITY_BASE}/core/Account/Login`;
const SIGNIN_OIDC_URL = `${SHOP_BASE}/signin-oidc`;
const PRODUCT_DETAIL_URL = `${SHOP_BASE}/api/s_v4/Product/Detail`;
const TRIGGER_AUTH_URL = `${SHOP_BASE}/?triggerAuth=true`;
const SEARCH_URL = `${SHOP_BASE}/api/s_v3/Product/Search/`;

const SEARCH_PAGE_SIZE = 100;

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const TIMEOUT_MS = 20_000;

// ---------------------------------------------------------------------------
// TypeScript types for the Bidfood Product Detail API response
// ---------------------------------------------------------------------------

interface BidfoodUOMPrice {
  UOMTypeID: number;
  UomCode: string;
  UOMDescription: string;
  Price: number | null;
  PackSize: string | null;
  Available: boolean;
}

interface BidfoodProductDetail {
  ItemCode: number;
  ProductCode: string;
  Description: string;
  AccountID: number;
  PackSize: string | null;
  PackSizeDim: string | null;
  SelectedUOMPrice: BidfoodUOMPrice | null;
  UOMPrices: BidfoodUOMPrice[];
}

interface BidfoodSearchItem {
  ItemCode: number;
  ProductCode: string;
  Description: string | null;
  PackSize: string | null;
  SelectedUOMPrice: BidfoodUOMPrice | null;
  UOMPrices: BidfoodUOMPrice[];
}

interface BidfoodSearchProducts {
  Items: BidfoodSearchItem[];
  Count: number;
  NextPageLink: string | null;
}

interface BidfoodSearchResponse {
  products: BidfoodSearchProducts;
}

// ---------------------------------------------------------------------------
// Monetary conversion helper
// ---------------------------------------------------------------------------

/**
 * Convert a dollar-value price from the Bidfood API to millicents
 * (the platform's internal monetary unit: 1/100,000 of a dollar).
 * Returns null if the value is not a valid positive number.
 */
function dollarToMillicents(dollars: number): number | null {
  if (!isFinite(dollars) || dollars < 0) return null;
  return Math.round(dollars * 100_000);
}

// ---------------------------------------------------------------------------
// URL parsing helper
// ---------------------------------------------------------------------------

/**
 * Extract the Bidfood ProductCode from a product URL.
 *
 * Bidfood NZ is an Angular SPA and uses hash-based routing. Product URLs
 * typically have one of these forms:
 *   https://www.mybidfood.co.nz/#/products/detail/172141
 *   https://www.mybidfood.co.nz/products/detail/172141
 *   https://www.mybidfood.co.nz/products/detail/172141/flour-strong-white
 *
 * The ProductCode is a sequence of digits at or near the end of the path.
 * Returns null if no numeric segment is found.
 */
function extractProductCodeFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    // Hash fragment takes priority (Angular hash routing: #/products/detail/172141)
    const hashPath = u.hash.replace(/^#\/?/, "");
    const combined = hashPath || u.pathname;
    const segments = combined.split("/").filter(Boolean);
    // Walk from the end — the ProductCode is the last purely numeric segment.
    for (let i = segments.length - 1; i >= 0; i--) {
      if (/^\d+$/.test(segments[i])) return segments[i];
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// HTML parsing helpers (regex-based — no external dependency)
// ---------------------------------------------------------------------------

/**
 * Extract ALL hidden input fields from an HTML form as a key→value map.
 */
function extractHiddenFields(html: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const re =
    /<input[^>]+type=["']hidden["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0];
    const nameM = tag.match(/name=["']([^"']+)["']/i);
    const valueM = tag.match(/value=["']([^"']*)["']/i);
    if (nameM) {
      fields[nameM[1]] = valueM ? valueM[1] : "";
    }
  }
  return fields;
}

/**
 * Extract the action URL from the first <form> element in the HTML.
 * Returns null if no action attribute is found.
 */
function extractFormAction(html: string): string | null {
  const m = html.match(/<form[^>]+action=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

/**
 * Collect Set-Cookie header values from a Response into a single cookie string.
 */
function collectCookies(res: Response, existing = ""): string {
  const rawCookies = res.headers.getSetCookie
    ? res.headers.getSetCookie()
    : // Fallback for environments that expose only get()
    (res.headers.get("set-cookie") ?? "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

  const parts: string[] = [];

  // Keep existing cookies that are not overwritten
  for (const part of existing.split(";").map((p) => p.trim()).filter(Boolean)) {
    parts.push(part);
  }

  for (const raw of rawCookies) {
    // Each Set-Cookie line: "name=value; Path=/; ..."
    const nameValue = raw.split(";")[0].trim();
    const eqIdx = nameValue.indexOf("=");
    if (eqIdx <= 0) continue;
    const cookieName = nameValue.slice(0, eqIdx).trim();
    // Overwrite if already present
    const existingIdx = parts.findIndex((p) => p.startsWith(`${cookieName}=`));
    if (existingIdx >= 0) {
      parts[existingIdx] = nameValue;
    } else {
      parts.push(nameValue);
    }
  }

  return parts.join("; ");
}

// ---------------------------------------------------------------------------
// BidfoodScraper
// ---------------------------------------------------------------------------

function mergeCookieHeaders(...cookieHeaders: (string | undefined)[]) {
  const cookies: Record<string, string> = {};

  for (const header of cookieHeaders) {
    if (!header) continue;

    const parts = header.split(";");

    for (const part of parts) {
      const [name, value] = part.trim().split("=");

      if (!name || !value) continue;

      cookies[name] = value;
    }
  }


  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}



export class BidfoodScraper implements SupplierScraper {
  private readonly generic = new GenericScraper();

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return BIDFOOD_DOMAINS.some(
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
    return this.generic.parseHtml(html);
  }

  /**
   * Authenticate with the Bidfood NZ portal using an OpenID Connect
   * (IdentityServer4) form-based login flow.
   *
   * The flow:
   *   1. GET login page → extract all hidden fields (CSRF + env vars) + cookies
   *   2. POST credentials (redirect:manual) → capture cookies from 302, get Location
   *   3. GET Location (authorize/callback) → receive OIDC form_post HTML
   *   4. POST OIDC fields to signin-oidc (redirect:manual) → capture session cookies
   *   5. GET /api/s_v4/Account/GetAccount → extract AccountId for product API calls
   *
   * Returns a SessionContext with `authenticated: true`, `cookies`, and `accountId`.
   */
  async login(credential: SupplierCredentialPayload): Promise<SessionContext> {
    const baseLoginUrl = credential.loginUrl ?? DEFAULT_LOGIN_URL;
    const fail = { loginUrl: baseLoginUrl, username: credential.username, authenticated: false };

    // ------------------------------------------------------------------
    // Step 0: Trigger the authentication flow by visiting the shop homepage with a special query parameter. This sets some preliminary cookies (e.g. ShopOidc) that are required for the subsequent OIDC flow and may help the server correlate the session across the multiple redirects.
    // ------------------------------------------------------------------
    const triggerRes = await fetch(TRIGGER_AUTH_URL, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,*/*",
      },
      redirect: "manual",
    });

    const shopOidcCookies = collectCookies(triggerRes);

    const authorizeUrl = triggerRes.headers.get("location");

    if (!authorizeUrl) {
      console.error("Bidfood triggerAuth did not return authorize URL");
      return fail;
    }

    // ------------------------------------------------------------------
    // Step 1: GET the login page to obtain all hidden form fields and the
    // anti-forgery cookies set by ASP.NET Core.
    // ------------------------------------------------------------------
    let loginPageHtml: string;
    let loginPageCookies = "";
    try {
      const res = await fetch(baseLoginUrl, {
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          Accept: "text/html,application/xhtml+xml,*/*",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!res.ok) {
        console.error(`[BidfoodScraper] login page returned HTTP ${res.status}`);
        return fail;
      }

      loginPageHtml = await res.text();
      loginPageCookies = collectCookies(res);
    } catch (err) {
      console.error(
        `[BidfoodScraper] failed to fetch login page: ${err instanceof Error ? err.message : String(err)}`
      );
      return fail;
    }

    // Extract all hidden fields. The login form embeds the CSRF token
    // (__RequestVerificationToken) plus several environment fields
    // (BranchGroupId, CustomerGroupId, ShopV5BaseUrl, Language, Site, etc.)
    // that must be forwarded verbatim.
    const hiddenFields = extractHiddenFields(loginPageHtml);

    if (!hiddenFields["__RequestVerificationToken"]) {
      console.error("[BidfoodScraper] CSRF token not found on login page");
      return fail;
    }

    // ------------------------------------------------------------------
    // Step 2: POST credentials + all hidden fields.
    //
    // Use redirect:manual so that the Set-Cookie headers on the 302
    // response (idsrv.session + .AspNetCore.Identity.Application) are
    // captured before following the redirect.
    // ------------------------------------------------------------------
    const formFields: Record<string, string> = {
      ...hiddenFields,
      UserName: credential.username,
      Password: credential.password,
      StaySignIn: "false",
    };
    const formBody = new URLSearchParams(formFields);

    let accumulatedCookies = loginPageCookies;

    try {
      const res = await fetch(baseLoginUrl, {
        method: "POST",
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "text/html,application/xhtml+xml,*/*",
          Referer: baseLoginUrl,
          Origin: IDENTITY_BASE,
          ...(loginPageCookies ? { Cookie: loginPageCookies } : {}),
        },
        body: formBody.toString(),
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      // Capture cookies set on the 302 response.
      accumulatedCookies = collectCookies(res, accumulatedCookies);

    } catch (err) {
      console.error(
        `[BidfoodScraper] credential POST failed: ${err instanceof Error ? err.message : String(err)}`
      );
      return fail;
    }

    // ------------------------------------------------------------------
    // Step 3: Follow the redirect to the authorize/callback endpoint.
    // IS4 processes the OIDC request and returns an HTML page containing a
    // self-submitting form that targets signin-oidc on the shop domain.
    // ------------------------------------------------------------------
    // The authorize URL may be in the Location header from the triggerAuth step or from the credential POST step, depending on how the server handles the authentication flow. In practice, it appears that the triggerAuth URL is the one that returns the OIDC callback form, while the credential POST URL may return an intermediate page that sets some cookies but does not contain the form. To handle both cases, we attempt to fetch the authorize URL from the triggerAuth step first; if it's not present, we fall back to the credential POST step's redirect location.
    // const authorizeUrl =
    //   redirectLocation ?? `${IDENTITY_BASE}/core/connect/authorize/callback`;

    let callbackHtml: string;
    try {
      const res = await fetch(authorizeUrl, {
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          Accept: "text/html,application/xhtml+xml,*/*",
          Referer: IDENTITY_BASE,
          ...(accumulatedCookies ? { Cookie: accumulatedCookies } : {}),
        },
        redirect: "follow",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      accumulatedCookies = collectCookies(res, accumulatedCookies);

      if (!res.ok) {
        console.error(
          `[BidfoodScraper] authorize callback returned HTTP ${res.status}`
        );
        return fail;
      }

      callbackHtml = await res.text();
    } catch (err) {
      console.error(
        `[BidfoodScraper] authorize callback fetch failed: ${err instanceof Error ? err.message : String(err)}`
      );
      return fail;
    }

    // ------------------------------------------------------------------
    // Step 4: Submit the OIDC form_post to signin-oidc.
    //
    // The callback HTML contains a self-submitting form like:
    //   <form method="POST" action="https://www.mybidfood.co.nz/signin-oidc">
    //     <input type="hidden" name="code" value="..." />
    //     <input type="hidden" name="id_token" value="..." />
    //     <input type="hidden" name="state" value="..." />
    //     <input type="hidden" name="session_state" value="..." />
    //   </form>
    //
    // Use redirect:manual to capture the final shop session cookies from
    // the 302 response before the browser would redirect to the homepage.
    // ------------------------------------------------------------------
    const oidcFormAction = extractFormAction(callbackHtml) ?? SIGNIN_OIDC_URL;
    const oidcFields = extractHiddenFields(callbackHtml);

    if (Object.keys(oidcFields).length === 0) {
      // No OIDC fields found — the flow may have ended early (e.g. the site
      // returned a direct session cookie without a form_post step).
      if (accumulatedCookies) {
        const accountId = await this.fetchAccountId(accumulatedCookies);
        return {
          loginUrl: baseLoginUrl,
          username: credential.username,
          authenticated: true,
          cookies: accumulatedCookies,
          accountId,
        };
      }
      console.error("[BidfoodScraper] OIDC callback form not found in authorize response");
      return fail;
    }

    const oidcBody = new URLSearchParams(oidcFields);

    const signinCookieHeader = mergeCookieHeaders(
      accumulatedCookies,
      shopOidcCookies
    );

    let sessionCookies = accumulatedCookies;
    try {
      const res = await fetch(oidcFormAction, {
        method: "POST",
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "text/html,application/xhtml+xml,*/*",
          Referer: `${IDENTITY_BASE}/`,
          ...(signinCookieHeader ? { Cookie: signinCookieHeader } : {}),
        },
        body: oidcBody.toString(),
        // Use manual redirect so that the Set-Cookie headers on the 302
        // response from signin-oidc are captured before the redirect is followed.
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      sessionCookies = collectCookies(res, sessionCookies);

      if (!res.ok && res.status !== 302) {
        console.error(
          `[BidfoodScraper] signin-oidc POST returned HTTP ${res.status}`
        );
        return fail;
      }
    } catch (err) {
      console.error(
        `[BidfoodScraper] signin-oidc POST failed: ${err instanceof Error ? err.message : String(err)}`
      );
      return fail;
    }

    if (!sessionCookies) {
      console.error("[BidfoodScraper] no session cookies received after OIDC flow");
      return fail;
    }

    // ------------------------------------------------------------------
    // Step 5: Fetch the customer AccountId from the account API.
    // The AccountId is required as a query parameter in subsequent
    // product API calls.
    // ------------------------------------------------------------------
    const accountId = await this.fetchAccountId(sessionCookies);

    return {
      loginUrl: baseLoginUrl,
      username: credential.username,
      authenticated: true,
      cookies: sessionCookies,
      accountId,
    };
  }

  /**
   * Fetch the Bidfood customer AccountId by calling the account info API.
   * Returns 0 if the account ID cannot be determined (product API calls
   * will still be attempted; the server may infer the account from the
   * session cookie).
   */
  private async fetchAccountId(cookies: string): Promise<number> {
    try {
      const res = await fetch(SHOP_BASE, {
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          Accept: "text/html,application/xhtml+xml,*/*",
          Cookie: cookies,
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      const html = await res.text();

      if (!res.ok) {
        console.warn(`[BidfoodScraper] account API returned HTTP ${res.status}`);
        return 0;
      }

      const accountId = html.match(/"Account"\s*:\s*(\d+)/)?.[1] ?? null;

      return accountId ? parseInt(accountId, 10) : 0;
    } catch {
      // Non-fatal — scraping may still succeed if the server infers the account
      // from the session cookie.
      return 0;
    }
  }

  /**
   * Scrape a product using an authenticated session obtained via login().
   *
   * Calls GET /api/s_v4/Product/Detail?AccountId={accountId}&ProductCode={code}
   * with the session cookies. Price is taken from SelectedUOMPrice.Price (NZD)
   * and converted to millicents.
   */
  async scrapeWithSession(
    url: string,
    session: SessionContext
  ): Promise<ScrapedProduct> {
    const empty: ScrapedProduct = { name: null, price: null, currency: null, unit: null };

    if (!session.authenticated || !session.cookies) {
      console.warn("[BidfoodScraper] scrapeWithSession called without a valid session");
      return this.generic.scrape(url);
    }

    const productCode = extractProductCodeFromUrl(url);
    if (!productCode) {
      console.warn(`[BidfoodScraper] could not extract ProductCode from URL: ${url}`);
      return empty;
    }

    const accountId = typeof session.accountId === "number" ? session.accountId : 0;

    const apiUrl = new URL(PRODUCT_DETAIL_URL);
    apiUrl.searchParams.set("AccountId", String(accountId));
    apiUrl.searchParams.set("ProductCode", productCode);

    let res: Response;
    try {
      res = await fetch(apiUrl.toString(), {
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          Accept: "application/json",
          Cookie: session.cookies as string,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      console.error(
        `[BidfoodScraper] product detail request failed for ${productCode}: ${err instanceof Error ? err.message : String(err)}`
      );
      return empty;
    }

    if (!res.ok) {
      console.error(
        `[BidfoodScraper] product detail returned HTTP ${res.status} for ${productCode}`
      );
      return empty;
    }

    let detail: BidfoodProductDetail;
    try {
      detail = (await res.json()) as BidfoodProductDetail;
    } catch {
      console.error(`[BidfoodScraper] product detail response is not valid JSON for ${productCode}`);
      return empty;
    }

    // Price is taken from SelectedUOMPrice (the primary purchasable unit).
    // Falls back to the first entry in UOMPrices if SelectedUOMPrice is null.
    const uomPrice = detail.SelectedUOMPrice ?? detail.UOMPrices?.[0] ?? null;
    const dollarPrice = uomPrice?.Price ?? null;

    return {
      name: detail.Description ?? null,
      price: dollarPrice !== null ? dollarToMillicents(dollarPrice) : null,
      currency: "NZD",
      unit: uomPrice?.UomCode ?? null,
    };
  }

  /**
   * Fetch the authenticated product catalogue from Bidfood NZ.
   *
   * Calls GET /api/s_v3/Product/Search/ with an empty SearchText to retrieve
   * all products available to the authenticated account. Paginates through the
   * results using the $skip parameter until all products have been fetched.
   */
  async fetchProductList(session: SessionContext): Promise<ScrapedProduct[]> {
    if (!session.authenticated || !session.cookies) {
      console.warn(
        "[BidfoodScraper] fetchProductList called without a valid session"
      );
      return [];
    }

    const results: ScrapedProduct[] = [];
    let skip = 0;
    let totalCount: number | null = null;

    do {
      const url = new URL(SEARCH_URL);
      url.searchParams.set("SearchText", "");
      url.searchParams.set("selectedSearchTerm", "");
      url.searchParams.set("includeBanners", "false");
      url.searchParams.set("PageSize", String(SEARCH_PAGE_SIZE));
      url.searchParams.set("$skip", String(skip));

      let res: Response;
      try {
        res = await fetch(url.toString(), {
          headers: {
            "User-Agent": DEFAULT_USER_AGENT,
            Accept: "application/json",
            Cookie: session.cookies as string,
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            "if-modified-since": "Mon, 26 Jul 1997 05:00:00 GMT",
          },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch (err) {
        console.error(
          `[BidfoodScraper] fetchProductList search request failed at skip=${skip}: ${err instanceof Error ? err.message : String(err)}`
        );
        break;
      }

      if (!res.ok) {
        console.error(
          `[BidfoodScraper] fetchProductList search returned HTTP ${res.status} at skip=${skip}`
        );
        break;
      }

      let body: BidfoodSearchResponse;
      try {
        body = (await res.json()) as BidfoodSearchResponse;
      } catch {
        console.error(
          `[BidfoodScraper] fetchProductList response is not valid JSON at skip=${skip}`
        );
        break;
      }

      const items = body?.products?.Items;
      if (!Array.isArray(items) || items.length === 0) break;

      if (totalCount === null) {
        totalCount = body.products.Count ?? 0;
      }

      for (const item of items) {
        const uomPrice = item.SelectedUOMPrice ?? item.UOMPrices?.[0] ?? null;
        const dollarPrice = uomPrice?.Price ?? null;
        results.push({
          name: item.Description ?? null,
          price: dollarPrice !== null ? dollarToMillicents(dollarPrice) : null,
          currency: "NZD",
          unit: uomPrice?.UomCode ?? null,
        });
      }

      skip += items.length;

      // Stop if we've collected all products or received a partial page.
      if (totalCount !== null && results.length >= totalCount) break;
      if (items.length < SEARCH_PAGE_SIZE) break;
    } while (true);

    console.info(
      `[BidfoodScraper] fetchProductList fetched ${results.length} products`
    );
    return results;
  }
}
