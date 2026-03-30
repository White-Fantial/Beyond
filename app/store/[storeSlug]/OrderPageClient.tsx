"use client";

/**
 * OrderPageClient — interactive order page.
 *
 * Handles:
 * - Active category tracking (click + IntersectionObserver)
 * - Product modal state
 * - Cart interactions
 * - Pickup time selector state
 */

import { useState, useRef, useEffect, useCallback } from "react";
import CategoryBar from "@/components/order/CategoryBar";
import ProductSection from "@/components/order/ProductSection";
import ProductModal from "@/components/order/ProductModal";
import CartButton from "@/components/order/CartButton";
import PickupTimeSelector from "@/components/order/PickupTimeSelector";
import SubscriptionEntryLink from "@/components/order/SubscriptionEntryLink";
import { useCart } from "@/lib/cart/cart-context";
import { formatPickupLabel } from "@/lib/order/pickup-time";
import type { CustomerStore, CustomerCategory, CustomerProduct, CustomerProductDetail } from "@/services/customer-menu.service";
import type { SelectedModifier } from "@/lib/cart/cart-context";

interface OrderPageClientProps {
  store: CustomerStore;
  categories: CustomerCategory[];
  productsByCategory: Record<string, CustomerProduct[]>;
  storeSlug: string;
}

export default function OrderPageClient({
  store,
  categories,
  productsByCategory,
  storeSlug,
}: OrderPageClientProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    categories[0]?.id ?? null
  );
  const [modalProductId, setModalProductId] = useState<string | null>(null);
  const [showPickupSelector, setShowPickupSelector] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const { state, addItem } = useCart();

  // IntersectionObserver for auto-highlighting active category on scroll
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    for (const cat of categories) {
      const el = sectionRefs.current[cat.id];
      if (!el) continue;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveCategoryId(cat.id);
          }
        },
        { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    }

    return () => observers.forEach((o) => o.disconnect());
  }, [categories]);

  const handleCategoryClick = useCallback((categoryId: string) => {
    setActiveCategoryId(categoryId);
    const el = sectionRefs.current[categoryId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleAddProduct = useCallback(
    (product: CustomerProduct) => {
      if (product.hasModifiers) {
        setModalProductId(product.id);
      } else {
        addItem({
          productId: product.id,
          displayName: product.displayName,
          unitPrice: product.basePriceAmount,
          quantity: 1,
          selectedModifiers: [],
          imageUrl: product.imageUrl ?? undefined,
        });
      }
    },
    [addItem]
  );

  const handleAddToCart = useCallback(
    (
      product: CustomerProductDetail,
      selectedModifiers: SelectedModifier[],
      quantity: number
    ) => {
      addItem({
        productId: product.id,
        displayName: product.displayName,
        unitPrice: product.basePriceAmount,
        quantity,
        selectedModifiers,
        imageUrl: product.imageUrl ?? undefined,
      });
    },
    [addItem]
  );

  const pickupLabel = state.pickupTime
    ? formatPickupLabel(state.pickupTime, false)
    : "Select pickup time";

  return (
    <>
      {/* Store header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">
              {store.displayName || store.name}
            </h1>
            <button
              onClick={() => setShowPickupSelector(true)}
              className="mt-1 flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 transition-colors"
              aria-label="Change pickup time"
            >
              <span aria-hidden="true">🕐</span>
              <span className="font-medium">{pickupLabel}</span>
              <span className="text-gray-400" aria-hidden="true">›</span>
            </button>
          </div>
          <div className="flex-shrink-0">
            <CartButton storeSlug={storeSlug} />
          </div>
        </div>
      </header>

      {/* Category bar (sticky below header) */}
      <div className="sticky top-[73px] z-20 bg-white">
        <CategoryBar
          categories={categories}
          activeCategoryId={activeCategoryId}
          onCategoryClick={handleCategoryClick}
        />
      </div>

      {/* Product sections */}
      <main className="pb-28">
        {categories.map((cat) => (
          <div
            key={cat.id}
            ref={(el) => {
              sectionRefs.current[cat.id] = el;
            }}
          >
            <ProductSection
              categoryId={cat.id}
              categoryName={cat.name}
              products={productsByCategory[cat.id] ?? []}
              onAddProduct={handleAddProduct}
            />
          </div>
        ))}

        {/* Subscription entry */}
        <div className="px-4 pt-4 pb-2">
          <SubscriptionEntryLink storeSlug={storeSlug} />
        </div>
      </main>

      {/* Product modal */}
      {modalProductId && (
        <ProductModal
          productId={modalProductId}
          storeSlug={storeSlug}
          onClose={() => setModalProductId(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Pickup time selector */}
      {showPickupSelector && (
        <PickupTimeSelector onClose={() => setShowPickupSelector(false)} />
      )}
    </>
  );
}
