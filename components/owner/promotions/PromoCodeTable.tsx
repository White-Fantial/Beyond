import type { PromoCode } from "@/types/owner-promotions";
import Link from "next/link";

function statusColor(status: string) {
  if (status === "ACTIVE") return "bg-green-100 text-green-700";
  if (status === "INACTIVE") return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-500";
}

function discountLabel(promo: PromoCode) {
  if (promo.discountType === "PERCENT") return `${promo.discountValue}%`;
  if (promo.discountType === "FIXED_AMOUNT") return `$${promo.discountValue} off`;
  return "Free item";
}

interface Props {
  items: PromoCode[];
}

export default function PromoCodeTable({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400 text-sm">No promo codes yet.</div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Code</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Discount</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Uses</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Expires</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {items.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <Link
                  href={`/owner/promotions/${p.id}`}
                  className="font-mono font-semibold text-brand-700 hover:underline"
                >
                  {p.code}
                </Link>
                {p.description && (
                  <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>
                )}
              </td>
              <td className="px-4 py-3 text-gray-700">{discountLabel(p)}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(p.status)}`}
                >
                  {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500">
                {p.usedCount}
                {p.maxUses != null ? ` / ${p.maxUses}` : ""}
              </td>
              <td className="px-4 py-3 text-gray-400 text-xs">
                {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : "No expiry"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
