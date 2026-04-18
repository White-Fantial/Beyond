import type { SupplierScraper, ScrapedProduct } from "./base";
import { GenericScraper } from "./generic";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (compatible; BeyondBot/1.0; +https://beyondplatform.io/bot)";

const LOGIN_TIMEOUT_MS = 15_000;
const SCRAPE_TIMEOUT_MS = 15_000;

export interface CredentialInput {
  loginUrl: string | null;
  username: string;
  password: string;
}

/**
 * Attempts to log in to a supplier website using form-based credentials.
 * Returns the raw `Set-Cookie` header value(s) on success, or null on failure.
 *
 * The implementation uses a simple heuristic: POST to the loginUrl (or
 * derive one from the product URL) with common field names.
 */
async function acquireSessionCookie(
  productUrl: string,
  credential: CredentialInput
): Promise<string | null> {
  const loginUrl = credential.loginUrl ?? deriveLoginUrl(productUrl);
  if (!loginUrl) return null;

  try {
    const body = new URLSearchParams({
      username: credential.username,
      email: credential.username,
      login: credential.username,
      password: credential.password,
      passwd: credential.password,
    });

    const res = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "text/html,application/xhtml+xml,*/*",
        Referer: loginUrl,
      },
      body: body.toString(),
      redirect: "manual",
      signal: AbortSignal.timeout(LOGIN_TIMEOUT_MS),
    });

    // A successful login typically responds with a redirect + Set-Cookie
    const cookies = res.headers.get("set-cookie");
    if (cookies) return cookies;

    return null;
  } catch {
    return null;
  }
}

/** Best-effort: derive a login page URL from a product URL. */
function deriveLoginUrl(productUrl: string): string | null {
  try {
    const u = new URL(productUrl);
    return `${u.origin}/login`;
  } catch {
    return null;
  }
}

const genericScraper = new GenericScraper();

export class CredentialedScraper implements SupplierScraper {
  canHandle(_url: string): boolean {
    return true;
  }

  /**
   * Scrapes a product page using the provided credentials.
   * Falls back to unauthenticated scraping if login fails.
   */
  async scrapeWithCredential(
    url: string,
    credential: CredentialInput
  ): Promise<ScrapedProduct> {
    const sessionCookie = await acquireSessionCookie(url, credential);
    if (!sessionCookie) {
      // Fallback: unauthenticated scrape
      return genericScraper.scrape(url);
    }

    let html: string;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
          Cookie: sessionCookie,
        },
        signal: AbortSignal.timeout(SCRAPE_TIMEOUT_MS),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} fetching ${url}`);
      }
      html = await res.text();
    } catch (err) {
      throw new Error(
        `Failed to fetch supplier product page: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    return genericScraper.parseHtml(html);
  }

  /** Required by SupplierScraper interface — delegates to unauthenticated. */
  async scrape(url: string): Promise<ScrapedProduct> {
    return genericScraper.scrape(url);
  }
}

export const credentialedScraper = new CredentialedScraper();
