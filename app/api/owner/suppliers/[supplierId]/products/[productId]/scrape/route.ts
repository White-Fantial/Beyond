import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { scrapeProductForUser } from "@/services/owner/owner-supplier-scraper.service";

interface Params {
  params: Promise<{ supplierId: string; productId: string }>;
}

export async function POST(_req: Request, { params }: Params) {
  const { supplierId, productId } = await params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const userId = ctx.userId;
  console.log(`[API /suppliers/${supplierId}/products/${productId}/scrape] POST tenantId=${tenantId} userId=${userId}`);
  try {
    const result = await scrapeProductForUser(tenantId, userId, productId);
    console.log(`[API /suppliers/${supplierId}/products/${productId}/scrape] completed changed=${result.changed} newPrice=${result.newPrice}`);
    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scrape failed";
    console.error(`[API /suppliers/${supplierId}/products/${productId}/scrape] error: ${message}`);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
