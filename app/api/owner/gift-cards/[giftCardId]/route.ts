import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { getGiftCardDetail } from "@/services/owner/owner-gift-cards.service";

export async function GET(
  _req: Request,
  { params }: { params: { giftCardId: string } }
) {
  const ctx = await requireAuth();
  try {
    const detail = await getGiftCardDetail(ctx.tenantId, params.giftCardId);
    return NextResponse.json({ data: detail });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
