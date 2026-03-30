"use client";

import { useCart } from "@/lib/cart/cart-context";
import { formatPickupLabel } from "@/lib/order/pickup-time";

interface PickupTimeChipProps {
  onClick?: () => void;
}

export default function PickupTimeChip({ onClick }: PickupTimeChipProps) {
  const { state } = useCart();
  const pickupTime = state.pickupTime;

  const label = pickupTime
    ? formatPickupLabel(pickupTime, false)
    : "Select pickup time";

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm text-brand-600 font-medium hover:text-brand-700 transition-colors"
      aria-label="Change pickup time"
    >
      <span aria-hidden="true">🕐</span>
      <span>{label}</span>
      <span className="text-gray-400" aria-hidden="true">›</span>
    </button>
  );
}
