"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import type { ProductFull } from "@/lib/storefront";

interface AddToCartButtonProps {
  product: ProductFull;
  currencySymbol: string;
}

export default function AddToCartButton({
  product,
  currencySymbol,
}: AddToCartButtonProps) {
  const { addItem, openDrawer } = useCart();
  const router = useRouter();

  const hasVariants = product.variants.length > 0;

  // ── Variant selection ─────────────────────────────────────────────────────
  // We pick the first active variant as default
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    hasVariants ? (product.variants[0]?.id ?? null) : null,
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const selectedVariant = hasVariants
    ? product.variants.find((v) => v.id === selectedVariantId) ?? null
    : null;

  // Effective price: variant overrides product price
  const effectivePrice = selectedVariant?.price
    ? Number(selectedVariant.price)
    : Number(product.price);

  // Stock check
  const inStock = hasVariants && selectedVariant
    ? selectedVariant.stock_quantity > 0
    : !product.track_inventory || product.stock_quantity > 0;

  // Group option keys for the selector UI
  const variantOptionKeys =
    hasVariants && product.variants.length > 0
      ? Object.keys((product.variants[0].options as Record<string, string>) ?? {})
      : [];

  function handleAddToCart() {
    if (!inStock) return;

    addItem({
      productId: product.id,
      variantId: selectedVariant?.id ?? null,
      productName: product.name,
      variantName: selectedVariant?.name ?? null,
      sku: selectedVariant?.sku ?? product.sku ?? null,
      unitPrice: effectivePrice,
      quantity,
      imageUrl:
        selectedVariant?.image_url ??
        product.feature_image_url ??
        null,
      options: selectedVariant
        ? (selectedVariant.options as Record<string, string>)
        : null,
    });

    setAdded(true);
    openDrawer();
    setTimeout(() => setAdded(false), 2000);
  }

  function handleBuyNow() {
    if (!inStock) return;

    addItem({
      productId: product.id,
      variantId: selectedVariant?.id ?? null,
      productName: product.name,
      variantName: selectedVariant?.name ?? null,
      sku: selectedVariant?.sku ?? product.sku ?? null,
      unitPrice: effectivePrice,
      quantity,
      imageUrl:
        selectedVariant?.image_url ??
        product.feature_image_url ??
        null,
      options: selectedVariant
        ? (selectedVariant.options as Record<string, string>)
        : null,
    });

    router.push("/checkout");
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Interactive variant selector ────────────────────────────────── */}
      {hasVariants && variantOptionKeys.length > 0 && (
        <div className="flex flex-col gap-4">
          {variantOptionKeys.map((optKey) => {
            // Get unique values for this option key across all active variants
            const uniqueValues = [
              ...new Set(
                product.variants
                  .filter((v) => v.is_active)
                  .map((v) => (v.options as Record<string, string>)[optKey])
                  .filter(Boolean),
              ),
            ];

            return (
              <div key={optKey}>
                <p className="text-sm font-semibold text-zinc-700 mb-2 capitalize">
                  {optKey}
                  {selectedVariant && (
                    <span className="font-normal text-zinc-500 ml-2">
                      — {(selectedVariant.options as Record<string, string>)[optKey]}
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {uniqueValues.map((val) => {
                    // Find variant matching current option + value
                    const matchingVariant = product.variants.find((v) => {
                      const opts = v.options as Record<string, string>;
                      // For multi-key options, we check all other selected options too
                      const selectedOpts = selectedVariant
                        ? (selectedVariant.options as Record<string, string>)
                        : {};
                      return Object.keys(selectedOpts).every(
                        (k) => k === optKey || opts[k] === selectedOpts[k],
                      ) && opts[optKey] === val && v.is_active;
                    });

                    const isSelected =
                      selectedVariant &&
                      (selectedVariant.options as Record<string, string>)[optKey] === val;
                    const isUnavailable = !matchingVariant;

                    return (
                      <button
                        key={val}
                        type="button"
                        disabled={isUnavailable}
                        onClick={() => {
                          if (matchingVariant) setSelectedVariantId(matchingVariant.id);
                        }}
                        className={`px-3 py-1.5 text-sm border rounded-lg transition-all duration-150 ${
                          isSelected
                            ? "border-zinc-900 bg-zinc-900 text-white font-semibold"
                            : isUnavailable
                              ? "border-zinc-100 bg-zinc-50 text-zinc-300 cursor-not-allowed line-through"
                              : "border-zinc-200 text-zinc-700 bg-white hover:border-zinc-400 hover:bg-zinc-50"
                        }`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Quantity stepper ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-zinc-700">Quantity</span>
        <div className="flex items-center border border-zinc-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="px-3 py-2 text-zinc-600 hover:bg-zinc-50 transition-colors text-lg leading-none font-light"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="px-4 py-2 text-sm font-semibold text-zinc-900 min-w-[2.5rem] text-center">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            className="px-3 py-2 text-zinc-600 hover:bg-zinc-50 transition-colors text-lg leading-none font-light"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      {/* ── CTA Buttons ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          id="add-to-cart-btn"
          type="button"
          onClick={handleAddToCart}
          disabled={!inStock}
          className={`flex-1 font-semibold py-3.5 px-6 rounded-xl text-sm transition-all duration-200 ${
            !inStock
              ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
              : added
                ? "bg-emerald-600 text-white scale-[0.98]"
                : "bg-zinc-900 text-white hover:bg-zinc-700 active:scale-[0.98]"
          }`}
        >
          {!inStock
            ? "Out of Stock"
            : added
              ? "✓ Added to Cart"
              : "Add to Cart"}
        </button>

        {inStock && (
          <button
            id="buy-now-btn"
            type="button"
            onClick={handleBuyNow}
            className="flex-1 sm:flex-none border-2 border-zinc-900 text-zinc-900 font-semibold py-3.5 px-6 rounded-xl text-sm hover:bg-zinc-900 hover:text-white active:scale-[0.98] transition-all duration-200"
          >
            Buy Now — {currencySymbol}{(effectivePrice * quantity).toFixed(2)}
          </button>
        )}
      </div>
    </div>
  );
}
