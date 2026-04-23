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
 * Product pages:
 *   Product pages on www.mybidfood.co.nz are server-rendered. The scraper
 *   extracts price via JSON-LD / Open Graph tags (GenericScraper fallback)
 *   using the session cookies obtained from login().
 *
 * Product listing:
 *   fetchProductList() is a stub — replace with real Bidfood catalogue API
 *   endpoint once the authenticated order-guide/search API is identified.
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

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const TIMEOUT_MS = 20_000;

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
   * The four-step flow:
   *   1. GET login page → extract all hidden fields (CSRF + env vars) + cookies
   *   2. POST credentials (redirect:manual) → capture cookies from 302, get Location
   *   3. GET Location (authorize/callback) → receive OIDC form_post HTML
   *   4. POST OIDC fields to signin-oidc (redirect:manual) → capture session cookies
   *
   * Returns a SessionContext with `authenticated: true` and a `cookies` string
   * that must be forwarded as the `Cookie` header in subsequent requests.
   */
  async login(credential: SupplierCredentialPayload): Promise<SessionContext> {
    const baseLoginUrl = credential.loginUrl ?? DEFAULT_LOGIN_URL;
    const fail = { loginUrl: baseLoginUrl, username: credential.username, authenticated: false };

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

    let callbackCookies = loginPageCookies;
    let authorizeCallbackUrl: string | null = null;
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
      callbackCookies = collectCookies(res, callbackCookies);

      if (res.status === 302) {
        const location = res.headers.get("location");
        if (location) {
          // Resolve relative URL against the identity server base.
          authorizeCallbackUrl = location.startsWith("http")
            ? location
            : new URL(location, IDENTITY_BASE).toString();
        }
      } else if (!res.ok) {
        console.error(
          `[BidfoodScraper] credential POST returned HTTP ${res.status}`
        );
        return fail;
      } else {
        // 200 means the login form was re-rendered (invalid credentials).
        console.error("[BidfoodScraper] login failed — invalid credentials or unexpected response");
        return fail;
      }
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
    const callbackFetchUrl =
      authorizeCallbackUrl ?? `${IDENTITY_BASE}/core/connect/authorize/callback`;

    let callbackHtml: string;
    try {
      const res = await fetch(callbackFetchUrl, {
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          Accept: "text/html,application/xhtml+xml,*/*",
          Referer: IDENTITY_BASE,
          ...(callbackCookies ? { Cookie: callbackCookies } : {}),
        },
        redirect: "follow",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      callbackCookies = collectCookies(res, callbackCookies);

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
      if (callbackCookies) {
        return {
          loginUrl: baseLoginUrl,
          username: credential.username,
          authenticated: true,
          cookies: callbackCookies,
        };
      }
      console.error("[BidfoodScraper] OIDC callback form not found in authorize response");
      return fail;
    }

    const oidcBody = new URLSearchParams(oidcFields);

    let sessionCookies = callbackCookies;
    try {
      const res = await fetch(oidcFormAction, {
        method: "POST",
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "text/html,application/xhtml+xml,*/*",
          Referer: `${IDENTITY_BASE}/`,
          ...(callbackCookies ? { Cookie: callbackCookies } : {}),
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

    return {
      loginUrl: baseLoginUrl,
      username: credential.username,
      authenticated: true,
      cookies: sessionCookies,
    };
  }

  /**
   * Fetch the authenticated product catalogue from Bidfood NZ.
   *
   * TODO: replace stub with real implementation once the Bidfood catalogue
   * API endpoint is identified (typically via DevTools Network inspection
   * after logging in — look for XHR requests to /api/products or similar).
   */
  async fetchProductList(session: SessionContext): Promise<ScrapedProduct[]> {
    if (!session.authenticated || !session.cookies) {
      console.warn(
        "[BidfoodScraper] fetchProductList called without a valid session"
      );
      return [];
    }
    console.info(
      "[BidfoodScraper] fetchProductList stub called — not yet implemented"
    );
    return [];
  }
}
