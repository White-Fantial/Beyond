"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cart/cart-context";

interface PickupSlot {
  time: string; // ISO string
  label: string;
  isAsap: boolean;
}

interface PromoResult {
  valid: boolean;
  discountMinor: number;
  discountType: string;
  discountValue: string;
  description: string | null;
}

interface Props {
  storeSlug: string;
  storeName: string;
  pickupSlots: PickupSlot[];
}

function formatPrice(amount: number, currency = "NZD"): string {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

export default function CheckoutClient({ storeSlug, storeName, pickupSlots }: Props) {
  const router = useRouter();
  const { state, totalAmount, totalItems, clearCart } = useCart();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<PickupSlot | null>(
    pickupSlots[0] ?? null
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState(false);

  const cartItems = state.items;
  const effectiveTotal = Math.max(0, totalAmount - (promoResult?.discountMinor ?? 0));

  if (cartItems.length === 0 || !selectedSlot) {    return (
      <div className="max-w-lg mx-auto px-4 py-8 text-center">
        <div className="text-5xl mb-4">🛒</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <Link
          href={`/store/${storeSlug}`}
          className="inline-block mt-4 px-6 py-3 bg-brand-600 text-white rounded-full font-semibold hover:bg-brand-700 transition-colors"
        >
          Back to Menu
        </Link>
      </div>
    );
  }

  async function validatePromo() {
    if (!promoCode.trim()) return;
    setPromoError(null);
    setPromoResult(null);
    setPromoLoading(true);
    try {
      const res = await fetch(`/api/store/${storeSlug}/promo/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode.trim(), orderAmountMinor: totalAmount }),
      });
      const body = (await res.json()) as { data?: PromoResult; error?: string };
      if (!res.ok) {
        setPromoError(body.error ?? "Invalid promo code.");
      } else {
        setPromoResult(body.data ?? null);
      }
    } catch {
      setPromoError("Could not validate promo code. Please try again.");
    } finally {
      setPromoLoading(false);
    }
  }

  function clearPromo() {
    setPromoCode("");
    setPromoResult(null);
    setPromoError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedSlot) return;
    setSubmitting(true);

    try {
      const orderItems = cartItems.map((item) => ({
        productId: item.productId,
        productName: item.displayName,
        unitPriceAmount: item.unitPrice,
        quantity: item.quantity,
        selectedModifiers: item.selectedModifiers,
        notes: item.notes,
      }));

      const res = await fetch(`/api/store/${storeSlug}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          customerPhone: phone,
          customerEmail: email || undefined,
          pickupTime: selectedSlot.time,
          notes: notes || undefined,
          items: orderItems,
          currencyCode: "NZD",
          ...(promoResult?.valid ? { promoCode: promoCode.trim() } : {}),
          redeemLoyaltyPoints: redeemPoints,
        }),
      });

      const body = (await res.json()) as {
        data?: {
          orderId: string;
          discountApplied?: number;
          loyaltyPointsEarned?: number;
          loyaltyPointsRedeemed?: number;
        };
        error?: string;
      };

      if (!res.ok) {
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }

      clearCart();
      const { orderId, discountApplied, loyaltyPointsEarned } = body.data!;
      const params = new URLSearchParams();
      if (discountApplied) params.set("discount", String(discountApplied));
      if (loyaltyPointsEarned) params.set("earned", String(loyaltyPointsEarned));
      const qs = params.toString() ? `?${params.toString()}` : "";
      router.push(`/store/${storeSlug}/confirmation/${orderId}${qs}`);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-6 pb-28 space-y-6">
      {/* Order summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Order from {storeName}
        </h2>
        <ul className="divide-y divide-gray-50 text-sm">
          {cartItems.map((item) => {
            const lineTotal =
              item.quantity *
              (item.unitPrice +
                item.selectedModifiers.reduce((s, m) => s + m.priceDeltaAmount, 0));
            return (
              <li
                key={`${item.productId}-${item.selectedModifiers.map((m) => m.optionId).join(",")}`}
                className="py-2 flex justify-between"
              >
                <span className="text-gray-800">
                  {item.displayName}
                  {item.quantity > 1 && (
                    <span className="text-gray-400 ml-1">×{item.quantity}</span>
                  )}
                  {item.selectedModifiers.length > 0 && (
                    <span className="block text-xs text-gray-500">
                      {item.selectedModifiers.map((m) => m.optionName).join(", ")}
                    </span>
                  )}
                </span>
                <span className="font-medium text-gray-900 shrink-0 ml-2">
                  {formatPrice(lineTotal)}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-gray-100 mt-2 pt-2 space-y-1">
          <div className="flex justify-between text-sm text-gray-600">
            <span>
              {totalItems} item{totalItems !== 1 ? "s" : ""}
            </span>
            <span>{formatPrice(totalAmount)}</span>
          </div>
          {promoResult && promoResult.discountMinor > 0 && (
            <div className="flex justify-between text-sm text-green-700">
              <span>Promo discount</span>
              <span>−{formatPrice(promoResult.discountMinor)}</span>
            </div>
          )}
          {promoResult && promoResult.discountMinor > 0 && (
            <div className="flex justify-between text-sm font-bold text-gray-900">
              <span>Total</span>
              <span>{formatPrice(effectiveTotal)}</span>
            </div>
          )}
        </div>
        <Link
          href={`/store/${storeSlug}/cart`}
          className="mt-2 inline-block text-xs text-brand-600 hover:text-brand-800"
        >
          ← Edit cart
        </Link>
      </div>

      {/* Contact info */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Contact Details</h2>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="name">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="phone">
            Phone <span className="text-red-500">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+64 21 000 0000"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="email">
            Email (optional)
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Pickup time */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Pickup Time</h2>
        <div className="grid grid-cols-3 gap-2">
          {pickupSlots.map((slot) => (
            <button
              key={slot.time}
              type="button"
              onClick={() => setSelectedSlot(slot)}
              className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                selectedSlot.time === slot.time
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {slot.isAsap ? `ASAP (${slot.label})` : slot.label}
            </button>
          ))}
        </div>
      </div>

      {/* Order notes */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Order Notes (optional)</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Allergies, special requests…"
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Promo Code */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Promo Code</h2>
        {promoResult ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-green-700 font-medium">
              ✅ {promoCode.toUpperCase()}: −{formatPrice(promoResult.discountMinor)}
              {promoResult.description && (
                <span className="block text-xs text-green-600 font-normal">
                  {promoResult.description}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={clearPromo}
              className="text-xs text-gray-500 hover:text-gray-700 ml-4"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => {
                setPromoCode(e.target.value);
                setPromoError(null);
              }}
              placeholder="Enter promo code"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={validatePromo}
              disabled={promoLoading || !promoCode.trim()}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white text-sm font-semibold rounded-lg transition-colors shrink-0"
            >
              {promoLoading ? "…" : "Apply"}
            </button>
          </div>
        )}
        {promoError && (
          <p className="mt-1 text-xs text-red-600">{promoError}</p>
        )}
      </div>

      {/* Loyalty points */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={redeemPoints}
            onChange={(e) => setRedeemPoints(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm text-gray-700">Redeem loyalty points</span>
        </label>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 max-w-lg mx-auto">
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-semibold rounded-full transition-colors"
        >
          {submitting ? "Placing Order…" : `Place Order · ${formatPrice(effectiveTotal)}`}
        </button>
      </div>
    </form>
  );
}

