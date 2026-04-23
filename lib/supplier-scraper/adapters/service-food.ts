/**
 * Service Foods Online NZ Scraper Adapter.
 *
 * Handles product pages from the Service Foods Online trade portal
 * (servicefoodsonline.co.nz / servicefoodsonline.kiwi).
 *
 * Authentication uses a JSON REST API at api.servicefoodsonline.co.nz.
 * Login returns a JWT accessToken which is passed as a Bearer token in
 * subsequent authenticated requests.
 *
 * Product listing implementation is pending — a valid authenticated session
 * from login() can be used once the product-list endpoint is identified.
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

const LOGIN_API_URL = "https://api.servicefoodsonline.co.nz/web/auth/v1/login";

// Application key embedded in the Service Foods Online web client.
const APP_KEY = "T3bhwMWrT6wC84qEYynrq9zZ73nZ4wJR";

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
    return this.generic.scrape(url);
  }

  parseProductPage(html: string): ScrapedProduct {
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
   * Fetch the authenticated product catalogue.
   *
   * Requires a valid session obtained via `login()` (session.accessToken must
   * be set). Product listing endpoint TBD — capture via browser DevTools on
   * the order/catalogue page at servicefoodsonline.kiwi.
   */
  async fetchProductList(session: SessionContext): Promise<ScrapedProduct[]> {
    if (!session.authenticated || !session.accessToken) {
      console.warn(
        `[ServiceFoodScraper] fetchProductList called without a valid session`
      );
      return [];
    }
    // TODO: identify and call the product listing REST endpoint, e.g.:
    //   GET https://api.servicefoodsonline.co.nz/web/products/v1/...
    //   with header: Authorization: Bearer <session.accessToken>
    console.info(
      `[ServiceFoodScraper] fetchProductList not yet implemented — session authenticated as ${session.username}`
    );
    return [];
  }
}
