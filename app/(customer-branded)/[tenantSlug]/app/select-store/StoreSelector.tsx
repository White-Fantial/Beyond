"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { StoreOption } from "@/lib/customer-store-context";

interface Props {
  tenantSlug: string;
  tenantName: string;
  stores: StoreOption[];
  returnPath: string;
}

/**
 * Client component that renders the list of stores and handles selection.
 * On selection it calls POST /api/customer/store-context to persist the
 * choice, then navigates to the return path.
 */
export function StoreSelector({ tenantName, stores, returnPath }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSelect(storeId: string) {
    setLoading(storeId);
    try {
      const res = await fetch("/api/customer/store-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId }),
      });
      if (!res.ok) throw new Error("Failed to set store context");
      router.push(returnPath);
      router.refresh();
    } catch {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{tenantName}</h1>
        <p className="text-gray-500 mb-6">이용하실 스토어를 선택해주세요.</p>

        <ul className="space-y-3">
          {stores.map((store) => (
            <li key={store.id}>
              <button
                onClick={() => handleSelect(store.id)}
                disabled={loading !== null}
                className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm hover:border-brand-300 transition-all disabled:opacity-60"
              >
                <div className="font-semibold text-gray-900">{store.name}</div>
                {store.city && (
                  <div className="text-sm text-gray-500 mt-0.5">
                    📍 {store.city}
                    {store.addressLine1 ? ` · ${store.addressLine1}` : ""}
                  </div>
                )}
                {loading === store.id && (
                  <div className="text-xs text-brand-600 mt-1">선택 중…</div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
