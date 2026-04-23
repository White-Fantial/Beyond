import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { scrapeForUser } from "@/services/owner/owner-supplier-scraper.service";

export async function POST() {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const userId = ctx.userId;

  console.log(`[API /scrape/user] POST tenantId=${tenantId} userId=${userId}`);
  try {
    const result = await scrapeForUser(tenantId, userId);
    console.log(`[API /scrape/user] completed scraped=${result.scraped} skipped=${result.skipped} failed=${result.failed}`);
    return NextResponse.json({ data: result });
  } catch (err) {
    console.error(`[API /scrape/user] unhandled error:`, err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: err instanceof Error ? err.message : "Scrape failed" }, { status: 500 });
  }
}
