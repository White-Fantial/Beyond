import { NextResponse } from "next/server";
import { scrapeAllPlatformProducts } from "@/services/owner/owner-supplier-scraper.service";

/**
 * POST /api/cron/scrape-platform
 *
 * Platform-level scheduled scraping — fetches current prices for all PLATFORM
 * supplier products using unauthenticated scraping.
 * Observations are stored under PLATFORM_SCRAPER_TENANT_ID so they can be used
 * as the canonical reference price.
 *
 * Protected by CRON_SECRET environment variable.
 * In production this endpoint is called by Vercel Cron (see vercel.json).
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await scrapeAllPlatformProducts();
    console.log(`[cron/scrape-platform] Done:`, result);
    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scrape failed";
    console.error(`[cron/scrape-platform] Error:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
