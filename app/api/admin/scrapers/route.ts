import { NextResponse } from "next/server";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import { SCRAPER_REGISTRY } from "@/lib/supplier-scraper";

export async function GET() {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.isPlatformAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adapters = Object.entries(SCRAPER_REGISTRY).map(([key, scraper]) => ({
    key,
    supportsLogin: typeof scraper.login === "function",
    supportsFetchProductList: typeof scraper.fetchProductList === "function",
    supportsScrapeWithSession: typeof scraper.scrapeWithSession === "function",
  }));

  adapters.sort((a, b) => a.key.localeCompare(b.key));

  return NextResponse.json({ data: adapters });
}
