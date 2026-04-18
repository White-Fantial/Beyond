/**
 * Generic Supplier Scraper — Phase 4.
 *
 * Extracts product price and name from a supplier product page using:
 * 1. JSON-LD structured data (<script type="application/ld+json">)
 * 2. Open Graph / meta tags as a fallback
 *
 * Does NOT depend on Cheerio or any external HTML parsing library.
 * Uses standard Node fetch (available in Next.js 14+ runtime).
 */
import type { SupplierScraper, ScrapedProduct } from "./base";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (compatible; BeyondBot/1.0; +https://beyondplatform.io/bot)";

const SCRAPE_TIMEOUT_MS = 15_000;

/** Price normalised to minor units (cents). Returns null if unparseable. */
function parsePrice(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const str = String(raw).replace(/[^0-9.]/g, "");
  const num = parseFloat(str);
  if (isNaN(num)) return null;
  return Math.round(num * 100);
}

/** Extract text content of the first matching JSON-LD block. */
function extractJsonLd(html: string): ScrapedProduct | null {
  const scriptRegex =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const items: unknown[] = Array.isArray(data) ? data : [data];

      for (const item of items) {
        if (
          typeof item !== "object" ||
          item === null
        ) continue;

        const obj = item as Record<string, unknown>;
        const type = String(obj["@type"] ?? "").toLowerCase();
        if (!type.includes("product")) continue;

        const name =
          typeof obj.name === "string" ? obj.name : null;

        // Offers may be a single object or an array
        const offersRaw = obj.offers ?? obj.Offers;
        const offersList: unknown[] = Array.isArray(offersRaw)
          ? offersRaw
          : offersRaw
          ? [offersRaw]
          : [];

        for (const offer of offersList) {
          if (typeof offer !== "object" || offer === null) continue;
          const o = offer as Record<string, unknown>;
          const price = parsePrice(o.price ?? o.lowPrice ?? o.highPrice);
          if (price === null) continue;
          const currency =
            typeof o.priceCurrency === "string" ? o.priceCurrency : null;
          return { name, price, currency, unit: null };
        }
      }
    } catch {
      // Malformed JSON-LD — skip block
    }
  }
  return null;
}

/** Fallback: extract price from og:price:amount and og:price:currency meta tags. */
function extractOpenGraph(html: string): ScrapedProduct | null {
  const priceMatch = html.match(
    /<meta[^>]+property=["']og:price:amount["'][^>]+content=["']([^"']+)["']/i
  );
  const currencyMatch = html.match(
    /<meta[^>]+property=["']og:price:currency["'][^>]+content=["']([^"']+)["']/i
  );
  const titleMatch = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
  );

  if (!priceMatch) return null;

  const price = parsePrice(priceMatch[1]);
  if (price === null) return null;

  return {
    name: titleMatch ? titleMatch[1] : null,
    price,
    currency: currencyMatch ? currencyMatch[1] : null,
    unit: null,
  };
}

export class GenericScraper implements SupplierScraper {
  canHandle(_url: string): boolean {
    return true; // handles any URL as a best-effort fallback
  }

  async scrape(url: string): Promise<ScrapedProduct> {
    let html: string;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
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

    const result = extractJsonLd(html) ?? extractOpenGraph(html);
    if (!result) {
      return { name: null, price: null, currency: null, unit: null };
    }
    return result;
  }
}
