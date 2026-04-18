import type { Supplier } from "@/types/owner-suppliers";
import Link from "next/link";

interface Props {
  items: Supplier[];
}

export default function SupplierTable({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
        No suppliers yet. Add one above.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 text-left font-medium">Supplier</th>
              <th className="px-5 py-3 text-left font-medium">Contact</th>
              <th className="px-5 py-3 text-right font-medium">Products</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((supplier) => (
              <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3">
                  <div className="font-medium text-gray-900">{supplier.name}</div>
                  {supplier.websiteUrl && (
                    <a
                      href={supplier.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-600 hover:underline"
                    >
                      {supplier.websiteUrl}
                    </a>
                  )}
                </td>
                <td className="px-5 py-3 text-gray-600">
                  {supplier.contactEmail ?? supplier.contactPhone ?? "—"}
                </td>
                <td className="px-5 py-3 text-right text-gray-700">
                  {supplier.productCount}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/owner/suppliers/${supplier.id}`}
                    className="text-brand-600 hover:text-brand-800 text-xs font-medium"
                  >
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
