"use client";

import type { SavedPaymentMethod } from "@/types/customer-payment-methods";

const BRAND_ICONS: Record<string, string> = {
  visa: "💳",
  mastercard: "💳",
  amex: "💳",
  discover: "💳",
};

interface Props {
  method: SavedPaymentMethod;
  onRemove: (id: string) => void;
  onSetDefault: (id: string) => void;
  removing?: boolean;
  settingDefault?: boolean;
}

export default function PaymentMethodCard({
  method,
  onRemove,
  onSetDefault,
  removing,
  settingDefault,
}: Props) {
  const icon = BRAND_ICONS[method.brand.toLowerCase()] ?? "💳";
  const isExpired =
    new Date() > new Date(method.expiryYear, method.expiryMonth - 1);

  return (
    <div className={`bg-white rounded-xl border ${method.isDefault ? "border-brand-400" : "border-gray-200"} p-4 shadow-sm`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 capitalize">
                {method.brand} •••• {method.last4}
              </span>
              {method.isDefault && (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-brand-50 text-brand-700 rounded">
                  Default
                </span>
              )}
              {isExpired && (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-red-50 text-red-600 rounded">
                  Expired
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              Expires {String(method.expiryMonth).padStart(2, "0")}/{method.expiryYear}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!method.isDefault && (
            <button
              onClick={() => onSetDefault(method.id)}
              disabled={settingDefault}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Set default
            </button>
          )}
          <button
            onClick={() => onRemove(method.id)}
            disabled={removing}
            className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {removing ? "Removing…" : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}
