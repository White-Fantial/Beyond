import type { PromoCodeDetail } from "@/types/owner-promotions";

function discountLabel(promo: PromoCodeDetail) {
  if (promo.discountType === "PERCENT") return `${promo.discountValue}%`;
  if (promo.discountType === "FIXED_AMOUNT") return `$${promo.discountValue} off`;
  return "Free item";
}

export default function PromoDetailCard({ promo }: { promo: PromoCodeDetail }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl font-mono font-bold text-brand-700">{promo.code}</span>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            promo.status === "ACTIVE"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {promo.status.charAt(0) + promo.status.slice(1).toLowerCase()}
        </span>
      </div>
      {promo.description && <p className="text-sm text-gray-500">{promo.description}</p>}
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-gray-400">Discount</dt>
          <dd className="font-medium text-gray-900">{discountLabel(promo)}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-400">Uses</dt>
          <dd className="font-medium text-gray-900">
            {promo.usedCount}
            {promo.maxUses != null ? ` / ${promo.maxUses}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-400">Starts</dt>
          <dd className="font-medium text-gray-900">
            {promo.startsAt ? new Date(promo.startsAt).toLocaleDateString() : "Immediately"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-400">Expires</dt>
          <dd className="font-medium text-gray-900">
            {promo.expiresAt ? new Date(promo.expiresAt).toLocaleDateString() : "Never"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
