"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TenantBillingAccountData } from "@/types/admin-billing";

interface Props {
  billingAccount: TenantBillingAccountData | null;
  tenantId: string;
}

export default function AdminBillingAccountCard({ billingAccount, tenantId }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    billingEmail: billingAccount?.billingEmail ?? "",
    companyName: billingAccount?.companyName ?? "",
    legalName: billingAccount?.legalName ?? "",
    taxNumber: billingAccount?.taxNumber ?? "",
    addressLine1: billingAccount?.addressLine1 ?? "",
    city: billingAccount?.city ?? "",
    region: billingAccount?.region ?? "",
    postalCode: billingAccount?.postalCode ?? "",
    countryCode: billingAccount?.countryCode ?? "",
    externalCustomerRef: billingAccount?.externalCustomerRef ?? "",
    notes: billingAccount?.notes ?? "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const payload = {
          billingEmail: form.billingEmail || undefined,
          companyName: form.companyName || null,
          legalName: form.legalName || null,
          taxNumber: form.taxNumber || null,
          addressLine1: form.addressLine1 || null,
          city: form.city || null,
          region: form.region || null,
          postalCode: form.postalCode || null,
          countryCode: form.countryCode || null,
          externalCustomerRef: form.externalCustomerRef || null,
          notes: form.notes || null,
        };
        const res = await fetch(`/api/admin/billing/tenants/${tenantId}/account`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "저장에 실패했습니다.");
          return;
        }
        setEditing(false);
        router.refresh();
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      }
    });
  }

  if (!editing) {
    return (
      <div>
        {billingAccount ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-8 text-sm">
            {[
              { label: "결제 이메일", value: billingAccount.billingEmail },
              { label: "회사명", value: billingAccount.companyName },
              { label: "법인명", value: billingAccount.legalName },
              { label: "사업자번호", value: billingAccount.taxNumber },
              { label: "주소", value: billingAccount.addressLine1 },
              { label: "도시", value: billingAccount.city },
              { label: "지역", value: billingAccount.region },
              { label: "우편번호", value: billingAccount.postalCode },
              { label: "국가 코드", value: billingAccount.countryCode },
              { label: "외부 고객 ID", value: billingAccount.externalCustomerRef },
            ]
              .filter((item) => item.value)
              .map((item) => (
                <div key={item.label}>
                  <span className="text-xs text-gray-500">{item.label}</span>
                  <div className="font-medium text-gray-900">{item.value}</div>
                </div>
              ))}
            {billingAccount.notes && (
              <div className="col-span-2">
                <span className="text-xs text-gray-500">내부 메모</span>
                <div className="text-sm text-gray-600">{billingAccount.notes}</div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">결제 계정 정보가 없습니다.</p>
        )}
        <button
          onClick={() => setEditing(true)}
          className="mt-4 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
        >
          {billingAccount ? "결제 계정 수정" : "결제 계정 등록"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { name: "billingEmail", label: "결제 이메일 *", type: "email" },
          { name: "companyName", label: "회사명", type: "text" },
          { name: "legalName", label: "법인명", type: "text" },
          { name: "taxNumber", label: "사업자번호", type: "text" },
          { name: "addressLine1", label: "주소", type: "text" },
          { name: "city", label: "도시", type: "text" },
          { name: "region", label: "지역", type: "text" },
          { name: "postalCode", label: "우편번호", type: "text" },
          { name: "countryCode", label: "국가 코드 (예: NZ)", type: "text" },
          { name: "externalCustomerRef", label: "외부 고객 ID (예: Stripe cus_...)", type: "text" },
        ].map((field) => (
          <div key={field.name}>
            <label className="block text-xs font-medium text-gray-700 mb-1">{field.label}</label>
            <input
              name={field.name}
              type={field.type}
              value={form[field.name as keyof typeof form]}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">내부 메모</label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={2}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => { setEditing(false); setError(null); }}
          className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
}
