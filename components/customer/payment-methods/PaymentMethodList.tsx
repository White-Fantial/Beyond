"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SavedPaymentMethod } from "@/types/customer-payment-methods";
import PaymentMethodCard from "./PaymentMethodCard";
import AddPaymentMethodForm from "./AddPaymentMethodForm";

interface Props {
  initialMethods: SavedPaymentMethod[];
}

export default function PaymentMethodList({ initialMethods }: Props) {
  const router = useRouter();
  const [methods, setMethods] = useState(initialMethods);
  const [showForm, setShowForm] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  async function handleRemove(id: string) {
    setRemovingId(id);
    try {
      const res = await fetch(`/api/customer/payment-methods/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMethods((prev) => prev.filter((m) => m.id !== id));
        router.refresh();
      }
    } finally {
      setRemovingId(null);
    }
  }

  async function handleSetDefault(id: string) {
    setSettingDefaultId(id);
    try {
      const res = await fetch(`/api/customer/payment-methods/${id}/set-default`, {
        method: "PATCH",
      });
      if (res.ok) {
        const json = await res.json();
        setMethods((prev) =>
          prev.map((m) => ({ ...m, isDefault: m.id === id ? true : false }))
        );
        void json;
        router.refresh();
      }
    } finally {
      setSettingDefaultId(null);
    }
  }

  function handleAdded() {
    setShowForm(false);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Payment Methods</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm px-4 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition"
          >
            + Add Card
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-4">
          <AddPaymentMethodForm onAdded={handleAdded} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {methods.length === 0 && !showForm ? (
        <div className="py-12 text-center">
          <div className="text-4xl mb-3">💳</div>
          <p className="text-gray-500 mb-4">No saved payment methods yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-sm px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition"
          >
            Add your first card
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {methods.map((m) => (
            <PaymentMethodCard
              key={m.id}
              method={m}
              onRemove={handleRemove}
              onSetDefault={handleSetDefault}
              removing={removingId === m.id}
              settingDefault={settingDefaultId === m.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
