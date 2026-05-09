import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { scrapeSupplierForUser } from "@/services/owner/owner-supplier-scraper.service";

interface Params {
  params: Promise<{ supplierId: string }>;
}

export async function POST(_req: Request, { params }: Params) {
  const { supplierId } = await params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const userId = ctx.userId;
  console.log(`[API /suppliers/${supplierId}/scrape] POST tenantId=${tenantId} userId=${userId}`);
  try {
    const results = await scrapeSupplierForUser(tenantId, userId, supplierId);
    console.log(`[API /suppliers/${supplierId}/scrape] completed results=${results.length}`);
    return NextResponse.json({ data: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scrape failed";
    console.error(`[API /suppliers/${supplierId}/scrape] error: ${message}`);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
