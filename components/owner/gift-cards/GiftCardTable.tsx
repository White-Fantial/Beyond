import Link from "next/link";
import type { GiftCard } from "@/types/owner-gift-cards";

interface Props {
  items: GiftCard[];
}

function formatAmount(minor: number) {
  return `$${(minor / 100).toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
}

export default function GiftCardTable({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
        No gift cards yet. Issue one above.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 text-left font-medium">Code</th>
              <th className="px-5 py-3 text-left font-medium">Issued To</th>
              <th className="px-5 py-3 text-right font-medium">Initial Value</th>
              <th className="px-5 py-3 text-right font-medium">Balance</th>
              <th className="px-5 py-3 text-left font-medium">Expires</th>
              <th className="px-5 py-3 text-left font-medium">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((card) => (
              <tr key={card.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 font-mono text-gray-900">{card.code}</td>
                <td className="px-5 py-3 text-gray-600">{card.issuedToEmail ?? "—"}</td>
                <td className="px-5 py-3 text-right text-gray-700">{formatAmount(card.initialValue)}</td>
                <td className="px-5 py-3 text-right font-semibold text-gray-900">{formatAmount(card.currentBalance)}</td>
                <td className="px-5 py-3 text-gray-600">{card.expiresAt ? formatDate(card.expiresAt) : "No expiry"}</td>
                <td className="px-5 py-3">
                  {card.isVoided ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Voided</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link href={`/owner/gift-cards/${card.id}`} className="text-brand-600 hover:text-brand-800 text-xs font-medium">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
