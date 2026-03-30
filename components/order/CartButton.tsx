"use client";

import { useCart } from "@/lib/cart/cart-context";
import Link from "next/link";

interface CartButtonProps {
  storeSlug: string;
}

export default function CartButton({ storeSlug }: CartButtonProps) {
  const { totalItems, totalAmount } = useCart();

  // TODO: derive currency from store context once CartProvider receives store currency
  const formatted = new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    minimumFractionDigits: 2,
  }).format(totalAmount / 100);

  if (totalItems === 0) {
    return (
      <Link
        href={`/store/${storeSlug}/cart`}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-gray-100 text-gray-500 text-sm font-medium"
        aria-label="View cart"
      >
        <span>🛒</span>
        <span>Cart</span>
      </Link>
    );
  }

  return (
    <Link
      href={`/store/${storeSlug}/cart`}
      className="flex items-center gap-2 px-3 py-2 rounded-full bg-brand-600 text-white text-sm font-semibold shadow hover:bg-brand-700 transition-colors"
      aria-label={`View cart — ${totalItems} item${totalItems !== 1 ? "s" : ""}`}
    >
      <span className="flex items-center justify-center w-5 h-5 bg-white text-brand-600 rounded-full text-xs font-bold">
        {totalItems}
      </span>
      <span className="hidden sm:inline">View Cart</span>
      <span className="text-brand-100 font-normal">{formatted}</span>
    </Link>
  );
}
