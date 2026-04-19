import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { scrapeAllUsersForProduct } from "@/services/owner/owner-supplier-scraper.service";

interface Params {
  params: { productId: string };
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { productId } = params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  try {
    const result = await scrapeAllUsersForProduct(tenantId, productId);
    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scrape failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
