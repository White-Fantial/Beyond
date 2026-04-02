import { labelBillingRecordType, labelBillingRecordStatus, formatPriceMinor } from "@/lib/billing/labels";
import type { BillingRecordRow } from "@/types/admin-billing";

interface Props {
  records: BillingRecordRow[];
}

export default function AdminBillingRecordTable({ records }: Props) {
  if (records.length === 0) {
    return <p className="text-sm text-gray-400 py-4 text-center">No billing records found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 border-b border-gray-200">
            <th className="text-left pb-2 pr-3">Type</th>
            <th className="text-left pb-2 pr-3">Status</th>
            <th className="text-right pb-2 pr-3">Amount</th>
            <th className="text-right pb-2 pr-3">만기일</th>
            <th className="text-right pb-2 pr-3">결제일</th>
            <th className="text-left pb-2">Description</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="border-b border-gray-50 last:border-0">
              <td className="py-2 pr-3 font-medium">{labelBillingRecordType(r.recordType)}</td>
              <td className="py-2 pr-3 text-gray-600">{labelBillingRecordStatus(r.status)}</td>
              <td className="py-2 pr-3 text-right">
                {r.amountMinor != null && r.currencyCode
                  ? formatPriceMinor(r.amountMinor, r.currencyCode)
                  : "—"}
              </td>
              <td className="py-2 pr-3 text-right text-xs text-gray-500">
                {r.dueAt ? new Date(r.dueAt).toLocaleDateString("ko-KR") : "—"}
              </td>
              <td className="py-2 pr-3 text-right text-xs text-gray-500">
                {r.paidAt ? new Date(r.paidAt).toLocaleDateString("ko-KR") : "—"}
              </td>
              <td className="py-2 text-xs text-gray-600 max-w-xs truncate">{r.summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
