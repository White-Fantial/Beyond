"use client";

import { useCart } from "@/lib/cart/cart-context";
import { getAvailablePickupSlots } from "@/lib/order/pickup-time";

interface PickupTimeSelectorProps {
  onClose: () => void;
  /** Store prep minutes from config (optional, defaults to constant). */
  prepMinutes?: number;
}

export default function PickupTimeSelector({
  onClose,
  prepMinutes,
}: PickupTimeSelectorProps) {
  const { state, setPickupTime } = useCart();
  const slots = getAvailablePickupSlots({ prepMinutes });

  const selectedTime = state.pickupTime?.getTime();

  const handleSelect = (time: Date) => {
    setPickupTime(time);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Select pickup time"
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full sm:max-w-sm bg-white sm:rounded-2xl rounded-t-2xl max-h-[70vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Choose Pickup Time</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {slots.map((slot) => {
            const isSelected = selectedTime === slot.time.getTime();
            return (
              <button
                key={slot.time.getTime()}
                onClick={() => handleSelect(slot.time)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                  isSelected
                    ? "bg-brand-50 border-brand-500 text-brand-700"
                    : "bg-white border-gray-200 hover:border-gray-300 text-gray-700"
                }`}
              >
                <span>{slot.label}</span>
                {slot.isAsap && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    Earliest
                  </span>
                )}
                {isSelected && (
                  <span className="text-brand-600" aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
