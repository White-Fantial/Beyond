"use client";

import { useState, useEffect } from "react";

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

function CardBrandIcon({ brand }: { brand: string }) {
  const icons: Record<string, string> = {
    visa: "💳 Visa",
    mastercard: "💳 Mastercard",
    amex: "💳 Amex",
    discover: "💳 Discover",
  };
  return <span className="text-sm">{icons[brand.toLowerCase()] ?? "💳 Card"}</span>;
}

export default function PaymentMethodsClient() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadMethods() {
    setLoading(true);
    try {
      const res = await fetch("/api/owner/billing/payment-methods");
      const body = (await res.json()) as { data?: PaymentMethod[]; error?: string };
      if (res.ok) setMethods(body.data ?? []);
      else setError(body.error ?? "Failed to load payment methods");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMethods();
  }, []);

  async function removeMethod(id: string) {
    setRemoving(id);
    setError(null);
    try {
      const res = await fetch(`/api/owner/billing/payment-methods/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMethods((prev) => prev.filter((m) => m.id !== id));
      } else {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? "Failed to remove payment method");
      }
    } catch {
      setError("Network error");
    } finally {
      setRemoving(null);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        Loading payment methods…
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {methods.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-3">💳</div>
          <p className="text-sm font-medium text-gray-700 mb-1">No payment methods</p>
          <p className="text-xs text-gray-500">
            Add a card to enable automatic billing for your subscription.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {methods.map((method) => (
            <div key={method.id} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <CardBrandIcon brand={method.brand} />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    •••• {method.last4}
                    {method.isDefault && (
                      <span className="ml-2 text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">
                        Default
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    Expires {method.expiryMonth.toString().padStart(2, "0")}/
                    {method.expiryYear}
                  </p>
                </div>
              </div>
              <button
                disabled={removing === method.id}
                onClick={() => removeMethod(method.id)}
                className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50 font-medium"
              >
                {removing === method.id ? "Removing…" : "Remove"}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">Adding a new card</p>
        <p className="text-xs text-blue-700">
          To add a new payment method, please contact support or use the{" "}
          <a href="#" className="underline">
            billing portal
          </a>
          . Stripe Elements integration requires a frontend Stripe.js setup (coming soon).
        </p>
      </div>
    </div>
  );
}
