import { requireAuth } from "@/lib/auth/permissions";
import { listPromoCodes } from "@/services/owner/owner-promotions.service";
import PromoCodeTable from "@/components/owner/promotions/PromoCodeTable";
import CreatePromoForm from "@/components/owner/promotions/CreatePromoForm";

export default async function OwnerPromotionsPage() {
  const ctx = await requireAuth();
  const result = await listPromoCodes(ctx.tenantId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Promotions</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {result.total} promo code{result.total !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
      <CreatePromoForm />
      <PromoCodeTable items={result.items} />
    </div>
  );
}
