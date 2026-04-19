import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { getBasePriceInfo } from "@/services/owner/owner-supplier-scraper.service";

interface Params {
  params: { productId: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { productId } = params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  try {
    const info = await getBasePriceInfo(tenantId, productId);
    return NextResponse.json({ data: info });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
