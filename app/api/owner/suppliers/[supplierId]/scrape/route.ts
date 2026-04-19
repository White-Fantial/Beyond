import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { scrapeAllSupplierProducts } from "@/services/owner/owner-supplier-scraper.service";

interface Params {
  params: { supplierId: string };
}

export async function POST(_req: Request, { params }: Params) {
  const { supplierId } = params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  try {
    const results = await scrapeAllSupplierProducts(tenantId, supplierId);
    return NextResponse.json({ data: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scrape failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
