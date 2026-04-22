import { NextResponse } from "next/server";
import { scrapeAllTenantsCredentialed } from "@/services/owner/owner-supplier-scraper.service";

/**
 * POST /api/cron/scrape-credentialed
 *
 * Credential-based scheduled scraping — iterates all active tenant credentials
 * and fetches personalised prices for each tenant's supplier products.
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
    const result = await scrapeAllTenantsCredentialed();
    console.log(`[cron/scrape-credentialed] Done:`, result);
    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scrape failed";
    console.error(`[cron/scrape-credentialed] Error:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
