import { requireAuth } from "@/lib/auth/permissions";
import { listGiftCards } from "@/services/owner/owner-gift-cards.service";
import GiftCardTable from "@/components/owner/gift-cards/GiftCardTable";
import IssueGiftCardForm from "@/components/owner/gift-cards/IssueGiftCardForm";

export default async function OwnerGiftCardsPage() {
  const ctx = await requireAuth();
  const result = await listGiftCards(ctx.tenantId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gift Cards</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {result.total} gift card{result.total !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
      <IssueGiftCardForm />
      <GiftCardTable items={result.items} />
    </div>
  );
}
