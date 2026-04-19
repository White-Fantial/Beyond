"use client";

import { useState } from "react";
import { useStoreContext } from "./StoreContextProvider";
import type { StoreOption } from "@/lib/customer-store-context";

interface Props {
  stores: StoreOption[];
}

/**
 * Renders a store-switcher button when the tenant has multiple customer-facing
 * stores. Opens a modal sheet for the customer to select a different store.
 */
export function StoreSwitcher({ stores }: Props) {
  const { ctx, switchStore } = useStoreContext();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  // Only render when there's more than one store to choose from
  if (!ctx.isMultiStore || stores.length <= 1) return null;

  async function handleSelect(storeId: string) {
    if (storeId === ctx.storeId) {
      setOpen(false);
      return;
    }
    setLoading(storeId);
    await switchStore(storeId);
  }

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        aria-label="Switch store"
      >
        <span>📍</span>
        <span className="max-w-[120px] truncate">{ctx.storeName}</span>
        <span className="text-xs">▾</span>
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-gray-900">스토어 선택</h2>
            <p className="text-sm text-gray-500">주문 및 구독을 확인할 스토어를 선택하세요.</p>

            <ul className="divide-y divide-gray-100">
              {stores.map((store) => (
                <li key={store.id}>
                  <button
                    onClick={() => handleSelect(store.id)}
                    disabled={loading !== null}
                    className={`w-full text-left px-3 py-3 flex items-center justify-between rounded-lg transition-colors ${
                      store.id === ctx.storeId
                        ? "bg-brand-50 text-brand-700"
                        : "hover:bg-gray-50 text-gray-800"
                    }`}
                  >
                    <div>
                      <div className="font-medium text-sm">{store.name}</div>
                      {store.city && (
                        <div className="text-xs text-gray-500">{store.city}</div>
                      )}
                    </div>
                    {store.id === ctx.storeId && (
                      <span className="text-xs font-semibold text-brand-600">현재</span>
                    )}
                    {loading === store.id && (
                      <span className="text-xs text-gray-400">로딩 중…</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>

            <button
              onClick={() => setOpen(false)}
              className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-2"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}
