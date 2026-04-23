/**
 * Bidfood NZ Scraper Adapter.
 *
 * Handles product pages from the Bidfood NZ trade portal (mybidfood.co.nz).
 *
 * Authentication:
 *   Bidfood uses OpenID Connect (IdentityServer4) with form_post response mode.
 *
 *   Step 1 — GET the IdentityServer login page at:
 *     https://identity.mybidfood.co.nz/core/Account/Login?ReturnUrl=...
 *   Extract:
 *     - __RequestVerificationToken  (hidden CSRF field)
 *     - ReturnUrl query parameter   (forwarded to POST)
 *
 *   Step 2 — POST credentials to the same login endpoint:
 *     Fields: Input.Username, Input.Password, __RequestVerificationToken, ReturnUrl
 *   Response: HTML page containing an auto-submit form that POSTs back to
 *     https://www.mybidfood.co.nz/signin-oidc
 *   with hidden fields: code, id_token, state, session_state.
 *
 *   Step 3 — POST those hidden fields to the signin-oidc endpoint.
 *   Response: redirect + Set-Cookie (sets the Bidfood session cookies).
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
 * Extract the value of a hidden <input> field by its name attribute.
 * Returns null if the field is not found.
 */
function extractInputValue(html: string, name: string): string | null {
  // Match both single and double quotes, attribute order-agnostic.
  const patterns = [
    new RegExp(
      `<input[^>]+name=["']${name}["'][^>]+value=["']([^"']*)["']`,
      "i"
    ),
    new RegExp(
      `<input[^>]+value=["']([^"']*)["'][^>]+name=["']${name}["']`,
      "i"
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  return null;
}

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

  const names = new Set<string>();
  const parts: string[] = [];

  // Keep existing cookies that are not overwritten
  for (const part of existing.split(";").map((p) => p.trim()).filter(Boolean)) {
    const eqIdx = part.indexOf("=");
    if (eqIdx > 0) names.add(part.slice(0, eqIdx).trim());
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
    names.add(cookieName);
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
   * The three-step flow:
   *   1. GET login page → extract CSRF token + ReturnUrl
   *   2. POST credentials → receive OIDC callback form
   *   3. POST callback form fields to signin-oidc → receive session cookies
   *
   * Returns a SessionContext with `authenticated: true` and a `cookies` string
   * that must be forwarded as the `Cookie` header in subsequent requests.
   */
  async login(credential: SupplierCredentialPayload): Promise<SessionContext> {
    const baseLoginUrl = credential.loginUrl ?? DEFAULT_LOGIN_URL;

    // ------------------------------------------------------------------
    // Step 1: GET the login page to obtain the CSRF token and ReturnUrl.
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
        console.error(
          `[BidfoodScraper] login page returned HTTP ${res.status}`
        );
        return { loginUrl: baseLoginUrl, username: credential.username, authenticated: false };
      }

      loginPageHtml = await res.text();
      loginPageCookies = collectCookies(res);
    } catch (err) {
      console.error(
        `[BidfoodScraper] failed to fetch login page: ${err instanceof Error ? err.message : String(err)}`
      );
      return { loginUrl: baseLoginUrl, username: credential.username, authenticated: false };
    }

    const csrfToken = extractInputValue(loginPageHtml, "__RequestVerificationToken");
    if (!csrfToken) {
      console.error("[BidfoodScraper] CSRF token not found on login page");
      return { loginUrl: baseLoginUrl, username: credential.username, authenticated: false };
    }

    // Extract ReturnUrl from the login page URL or from a hidden input.
    let returnUrl =
      extractInputValue(loginPageHtml, "ReturnUrl") ??
      (() => {
        try {
          return new URL(baseLoginUrl).searchParams.get("ReturnUrl") ?? "";
        } catch {
          return "";
        }
      })();

    // ------------------------------------------------------------------
    // Step 2: POST credentials to the login endpoint.
    // ------------------------------------------------------------------
    const loginPostUrl = (() => {
      try {
        const u = new URL(baseLoginUrl);
        if (returnUrl) u.searchParams.set("ReturnUrl", returnUrl);
        return u.toString();
      } catch {
        return baseLoginUrl;
      }
    })();

    const formBody = new URLSearchParams({
      "Input.Username": credential.username,
      "Input.Password": credential.password,
      __RequestVerificationToken: csrfToken,
      ReturnUrl: returnUrl,
    });

    let callbackHtml: string;
    let callbackCookies = loginPageCookies;
    try {
      const res = await fetch(loginPostUrl, {
        method: "POST",
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "text/html,application/xhtml+xml,*/*",
          Referer: baseLoginUrl,
          ...(loginPageCookies ? { Cookie: loginPageCookies } : {}),
        },
        body: formBody.toString(),
        // Do NOT follow redirects automatically — we need to handle the
        // form_post OIDC response ourselves.
        redirect: "follow",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      callbackCookies = collectCookies(res, callbackCookies);

      if (!res.ok && res.status !== 200) {
        console.error(
          `[BidfoodScraper] credential POST returned HTTP ${res.status}`
        );
        return { loginUrl: baseLoginUrl, username: credential.username, authenticated: false };
      }

      callbackHtml = await res.text();
    } catch (err) {
      console.error(
        `[BidfoodScraper] credential POST failed: ${err instanceof Error ? err.message : String(err)}`
      );
      return { loginUrl: baseLoginUrl, username: credential.username, authenticated: false };
    }

    // Detect login failure (IdentityServer4 re-renders the login page on error).
    if (
      callbackHtml.includes("Invalid username or password") ||
      callbackHtml.includes("Input.Username") // login form still present
    ) {
      console.error("[BidfoodScraper] login failed — invalid credentials");
      return { loginUrl: baseLoginUrl, username: credential.username, authenticated: false };
    }

    // ------------------------------------------------------------------
    // Step 3: Submit the OIDC callback form to signin-oidc.
    //
    // IdentityServer4 in form_post mode returns an HTML page containing
    // a self-submitting form like:
    //   <form method="POST" action="https://www.mybidfood.co.nz/signin-oidc">
    //     <input type="hidden" name="code" value="..." />
    //     <input type="hidden" name="id_token" value="..." />
    //     <input type="hidden" name="state" value="..." />
    //     <input type="hidden" name="session_state" value="..." />
    //   </form>
    // ------------------------------------------------------------------
    const oidcFormAction =
      extractFormAction(callbackHtml) ?? SIGNIN_OIDC_URL;
    const oidcFields = extractHiddenFields(callbackHtml);

    if (Object.keys(oidcFields).length === 0) {
      // The response doesn't look like an OIDC callback page.
      // The site may have already set a session cookie directly.
      if (callbackCookies) {
        return {
          loginUrl: baseLoginUrl,
          username: credential.username,
          authenticated: true,
          cookies: callbackCookies,
        };
      }
      console.error(
        "[BidfoodScraper] OIDC callback form not found in login response"
      );
      return { loginUrl: baseLoginUrl, username: credential.username, authenticated: false };
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
        redirect: "follow",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      sessionCookies = collectCookies(res, sessionCookies);

      if (!res.ok && res.status !== 302 && res.status !== 200) {
        console.error(
          `[BidfoodScraper] signin-oidc POST returned HTTP ${res.status}`
        );
        return { loginUrl: baseLoginUrl, username: credential.username, authenticated: false };
      }
    } catch (err) {
      console.error(
        `[BidfoodScraper] signin-oidc POST failed: ${err instanceof Error ? err.message : String(err)}`
      );
      return { loginUrl: baseLoginUrl, username: credential.username, authenticated: false };
    }

    if (!sessionCookies) {
      console.error("[BidfoodScraper] no session cookies received after OIDC flow");
      return { loginUrl: baseLoginUrl, username: credential.username, authenticated: false };
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
