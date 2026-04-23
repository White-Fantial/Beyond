import { NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { scrapeAllPlatformProducts } from "@/services/owner/owner-supplier-scraper.service";

/**
 * POST /api/admin/scrape/platform
 *
 * Manually triggers a platform-level scrape of all PLATFORM supplier products.
 * Stores observations under PLATFORM_SCRAPER_TENANT_ID and updates reference prices.
 *
 * Protected — requires platform admin role.
 */
export async function POST() {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.isPlatformAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const result = await scrapeAllPlatformProducts();
    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scrape failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
