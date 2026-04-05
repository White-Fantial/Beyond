import { requireAuth } from "@/lib/auth/permissions";
import { getPromoCodeDetail } from "@/services/owner/owner-promotions.service";
import PromoDetailCard from "@/components/owner/promotions/PromoDetailCard";
import Link from "next/link";

export default async function OwnerPromoDetailPage({
  params,
}: {
  params: Promise<{ promoId: string }>;
}) {
  const { promoId } = await params;
  const ctx = await requireAuth();
  const promo = await getPromoCodeDetail(ctx.tenantId, promoId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/owner/promotions" className="text-sm text-gray-400 hover:text-gray-600">
          ← Back
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Promo: {promo.code}</h1>
      </div>
      <PromoDetailCard promo={promo} />
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">
          Redemptions ({promo.redemptionCount})
        </h2>
        {promo.redemptions.length === 0 ? (
          <p className="text-sm text-gray-400">No redemptions yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    Redeemed at
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Order ID</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Discount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {promo.redemptions.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(r.redeemedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {r.orderId ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      ${(r.discountMinor / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
