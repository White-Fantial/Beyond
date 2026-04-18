import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { scrapeForUser } from "@/services/owner/owner-supplier-scraper.service";

export async function POST() {
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const userId = ctx.userId;

  const result = await scrapeForUser(tenantId, userId);
  return NextResponse.json({ data: result });
}
