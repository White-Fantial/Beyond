"use client";

import ConnectionCard from "./ConnectionCard";
import type { OwnerTenantConnectionCard } from "@/services/owner/owner-integrations.service";

interface Props {
  cards: OwnerTenantConnectionCard[];
}

const GROUP_ORDER = ["POS", "DELIVERY", "PAYMENT"];
const GROUP_LABELS: Record<string, string> = {
  POS: "Point of Sale",
  DELIVERY: "Delivery Channels",
  PAYMENT: "Payment",
};

export default function ConnectionGroupList({ cards }: Props) {
  const grouped = cards.reduce<Record<string, OwnerTenantConnectionCard[]>>((acc, card) => {
    const key = card.connectionType;
    if (!acc[key]) acc[key] = [];
    acc[key].push(card);
    return acc;
  }, {});

  const keys = [
    ...GROUP_ORDER.filter((k) => grouped[k]?.length),
    ...Object.keys(grouped).filter((k) => !GROUP_ORDER.includes(k) && grouped[k]?.length),
  ];

  if (keys.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
        <p className="text-sm text-gray-500">No integrations configured yet.</p>
        <p className="text-xs text-gray-400 mt-1">Add a store to start connecting platforms.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {keys.map((type) => (
        <section key={type}>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
            {GROUP_LABELS[type] ?? type}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {grouped[type].map((card) => (
              <ConnectionCard
                key={`${card.storeId}-${card.provider}-${card.connectionType}`}
                card={card}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
