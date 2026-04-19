import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { getGiftCardDetail } from "@/services/owner/owner-gift-cards.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ giftCardId: string }> }
) {
  const { giftCardId } = await params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  try {
    const detail = await getGiftCardDetail(tenantId, giftCardId);
    return NextResponse.json({ data: detail });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
