import { requireAuth } from "@/lib/auth/permissions";
import { getGiftCardDetail } from "@/services/owner/owner-gift-cards.service";
import { notFound } from "next/navigation";
import GiftCardDetailView from "@/components/owner/gift-cards/GiftCardDetailView";

interface Props {
  params: { giftCardId: string };
}

export default async function GiftCardDetailPage({ params }: Props) {
  const ctx = await requireAuth();
  try {
    const detail = await getGiftCardDetail(ctx.tenantId, params.giftCardId);
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gift Card</h1>
          <p className="text-sm font-mono text-gray-500 mt-0.5">{detail.code}</p>
        </div>
        <GiftCardDetailView detail={detail} />
      </div>
    );
  } catch {
    notFound();
  }
}
