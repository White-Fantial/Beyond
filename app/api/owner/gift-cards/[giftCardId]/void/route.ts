import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/permissions";
import { voidGiftCard } from "@/services/owner/owner-gift-cards.service";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ giftCardId: string }> }
) {
  const { giftCardId } = await params;
  const ctx = await requireAuth();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  try {
    const card = await voidGiftCard(tenantId, giftCardId);
    return NextResponse.json({ data: card });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error voiding gift card";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
