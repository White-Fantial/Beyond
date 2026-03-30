"use client";

import { useState, useEffect, useCallback } from "react";
import type { CustomerProductDetail, CustomerModifierGroup } from "@/services/customer-menu.service";
import type { SelectedModifier } from "@/lib/cart/cart-context";

interface ProductModalProps {
  productId: string | null;
  storeSlug: string;
  onClose: () => void;
  onAddToCart: (
    product: CustomerProductDetail,
    selectedModifiers: SelectedModifier[],
    quantity: number
  ) => void;
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

export default function ProductModal({
  productId,
  storeSlug,
  onClose,
  onAddToCart,
}: ProductModalProps) {
  const [product, setProduct] = useState<CustomerProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  // Fetch product detail when productId changes
  useEffect(() => {
    if (!productId) {
      setProduct(null);
      return;
    }
    setLoading(true);
    setSelections({});
    setQuantity(1);
    setValidationError(null);

    fetch(`/api/store/${storeSlug}/product/${productId}`)
      .then((r) => r.json())
      .then((data) => {
        setProduct(data.product ?? null);
        // Pre-select defaults
        if (data.product) {
          const defaults: Record<string, string[]> = {};
          for (const group of data.product.modifierGroups as CustomerModifierGroup[]) {
            const defaultOptions = group.options
              .filter((o) => o.isDefault && !o.isSoldOut)
              .map((o) => o.id);
            if (defaultOptions.length > 0) {
              defaults[group.id] = defaultOptions;
            }
          }
          setSelections(defaults);
        }
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [productId, storeSlug]);

  const toggleOption = useCallback(
    (groupId: string, optionId: string, selectionMax: number | null | undefined) => {
      setSelections((prev) => {
        const current = prev[groupId] ?? [];
        if (current.includes(optionId)) {
          return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
        }
        // If max is 1 (radio), replace selection
        if (selectionMax === 1) {
          return { ...prev, [groupId]: [optionId] };
        }
        // Otherwise multi-select up to max
        if (selectionMax && current.length >= selectionMax) return prev;
        return { ...prev, [groupId]: [...current, optionId] };
      });
    },
    []
  );

  const handleAdd = useCallback(() => {
    if (!product) return;

    // Validate required groups
    for (const group of product.modifierGroups) {
      const selected = selections[group.id] ?? [];
      if (group.isRequired && selected.length < group.selectionMin) {
        setValidationError(`Please select an option for "${group.name}"`);
        return;
      }
    }
    setValidationError(null);

    // Build SelectedModifier list
    const selectedModifiers: SelectedModifier[] = [];
    for (const group of product.modifierGroups) {
      const selectedIds = selections[group.id] ?? [];
      for (const optId of selectedIds) {
        const opt = group.options.find((o) => o.id === optId);
        if (opt) {
          selectedModifiers.push({
            modifierGroupId: group.id,
            modifierGroupName: group.name,
            optionId: opt.id,
            optionName: opt.name,
            priceDeltaAmount: opt.priceDeltaAmount,
          });
        }
      }
    }

    onAddToCart(product, selectedModifiers, quantity);
    onClose();
  }, [product, selections, quantity, onAddToCart, onClose]);

  if (!productId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Product options"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet / Modal */}
      <div className="relative w-full sm:max-w-lg bg-white sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
          aria-label="Close"
        >
          ✕
        </button>

        {loading && (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-gray-400 text-sm">Loading…</div>
          </div>
        )}

        {!loading && !product && (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-gray-400 text-sm">Product not found.</div>
          </div>
        )}

        {!loading && product && (
          <>
            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1">
              {/* Product hero */}
              <div className="flex gap-4 p-4 pb-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-gray-900">
                    {product.displayName}
                  </h2>
                  {product.description && (
                    <p className="text-sm text-gray-500 mt-1">{product.description}</p>
                  )}
                  <p className="text-base font-semibold text-gray-900 mt-2">
                    {formatPrice(product.basePriceAmount, product.currency)}
                  </p>
                </div>
                {product.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imageUrl}
                    alt={product.displayName}
                    className="w-20 h-20 object-cover rounded-xl flex-shrink-0"
                  />
                )}
              </div>

              {/* Modifier groups */}
              {product.modifierGroups.map((group) => (
                <div key={group.id} className="px-4 py-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {group.name}
                    </span>
                    {group.isRequired && (
                      <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full">
                        Required
                      </span>
                    )}
                    {!group.isRequired && (
                      <span className="text-xs text-gray-400">Optional</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {group.options.map((option) => {
                      const isSelected = (selections[group.id] ?? []).includes(
                        option.id
                      );
                      const isRadio = group.selectionMax === 1;
                      return (
                        <button
                          key={option.id}
                          onClick={() =>
                            !option.isSoldOut &&
                            toggleOption(group.id, option.id, group.selectionMax)
                          }
                          disabled={option.isSoldOut}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                            option.isSoldOut
                              ? "opacity-40 cursor-not-allowed bg-gray-50 border-gray-200"
                              : isSelected
                              ? "bg-brand-50 border-brand-500 text-brand-700"
                              : "bg-white border-gray-200 hover:border-gray-300 text-gray-700"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-4 h-4 flex-shrink-0 border-2 ${
                                isRadio ? "rounded-full" : "rounded"
                              } ${
                                isSelected
                                  ? "bg-brand-600 border-brand-600"
                                  : "border-gray-300"
                              }`}
                              aria-hidden="true"
                            />
                            <span>{option.name}</span>
                            {option.isSoldOut && (
                              <span className="text-xs text-gray-400">(Sold out)</span>
                            )}
                          </div>
                          {option.priceDeltaAmount !== 0 && (
                            <span className="text-xs font-medium">
                              {option.priceDeltaAmount > 0 ? "+" : ""}
                              {formatPrice(option.priceDeltaAmount, option.currency)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer: quantity + add to cart */}
            <div className="border-t border-gray-100 p-4 bg-white">
              {validationError && (
                <p className="text-sm text-red-600 mb-3">{validationError}</p>
              )}
              <div className="flex items-center gap-3">
                {/* Quantity stepper */}
                <div className="flex items-center border border-gray-200 rounded-full overflow-hidden">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-semibold text-gray-900">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                {/* Add to cart */}
                <button
                  onClick={handleAdd}
                  className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-full transition-colors active:scale-95"
                >
                  Add to Cart —{" "}
                  {formatPrice(
                    quantity *
                      (product.basePriceAmount +
                        product.modifierGroups.reduce((groupSum, group) => {
                          const selectedIds = selections[group.id] ?? [];
                          return (
                            groupSum +
                            selectedIds.reduce((optSum, optId) => {
                              const opt = group.options.find((o) => o.id === optId);
                              return optSum + (opt?.priceDeltaAmount ?? 0);
                            }, 0)
                          );
                        }, 0)),
                    product.currency
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
