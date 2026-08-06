"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import type { ProductFull } from "@/lib/storefront";

interface AddToCartButtonProps {
  product: ProductFull;
  currencySymbol: string;
  initialVariationParam?: string;
}

export default function AddToCartButton({
  product,
  currencySymbol,
  initialVariationParam,
}: AddToCartButtonProps) {
  const { addItem, openDrawer } = useCart();
  const router = useRouter();

  const hasVariants = product.variants.length > 0;

  // Calculate initial variant ID matching prod-productid-variationid or numeric ID
  const initialVariantId = (() => {
    if (!hasVariants) return null;
    if (initialVariationParam) {
      const normalized = initialVariationParam.toLowerCase();
      const match = product.variants.find(
        (v) =>
          v.is_active &&
          (normalized === `prod-${product.id}-${v.id}` ||
            v.id.toString() === initialVariationParam ||
            normalized.endsWith(`-${v.id}`) ||
            v.sku?.toLowerCase() === normalized),
      );
      if (match) return match.id;
    }
    return (
      product.variants.find((v) => v.is_active)?.id ??
      product.variants[0]?.id ??
      null
    );
  })();

  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    initialVariantId,
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const selectedVariant = hasVariants
    ? product.variants.find((v) => v.id === selectedVariantId) ?? null
    : null;

  // URL synchronization effect using prod-productid-variationid format
  useEffect(() => {
    if (typeof window === "undefined") return;

    const targetVariantId = selectedVariant?.id ?? product.variants[0]?.id;
    const targetVariationSegment = hasVariants && targetVariantId
      ? `prod-${product.id}-${targetVariantId}`
      : `prod-${product.id}`;

    const expectedPath = `/product/${product.slug}/${targetVariationSegment}`;
    if (window.location.pathname !== expectedPath) {
      window.history.replaceState(null, "", expectedPath);
    }
  }, [
    selectedVariant,
    selectedVariantId,
    product.slug,
    product.id,
    hasVariants,
    product.variants,
  ]);

  // Effective price calculations
  const effectivePrice = selectedVariant?.price
    ? Number(selectedVariant.price)
    : Number(product.price);

  const rawCompare = selectedVariant?.compare_at_price
    ? Number(selectedVariant.compare_at_price)
    : product.compare_at_price
      ? Number(product.compare_at_price)
      : null;

  const isOnSale = rawCompare !== null && rawCompare > effectivePrice;
  const discountPct = isOnSale
    ? Math.round(((rawCompare! - effectivePrice) / rawCompare!) * 100)
    : null;

  // Stock check
  const inStock = hasVariants && selectedVariant
    ? selectedVariant.stock_quantity > 0
    : !product.track_inventory || product.stock_quantity > 0;

  const lowStock = hasVariants && selectedVariant
    ? product.track_inventory && selectedVariant.stock_quantity > 0 && selectedVariant.stock_quantity <= product.low_stock_threshold
    : product.track_inventory && product.stock_quantity > 0 && product.stock_quantity <= product.low_stock_threshold;

  const stockQuantity = hasVariants && selectedVariant
    ? selectedVariant.stock_quantity
    : product.stock_quantity;

  const effectiveSku = selectedVariant?.sku || product.sku;

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
      sku: effectiveSku ?? null,
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
      sku: effectiveSku ?? null,
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
    <div className="flex flex-col gap-6">
      {/* ── Dynamic Pricing Section ───────────────────────────────────────── */}
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold text-zinc-900">
          {currencySymbol}
          {effectivePrice.toFixed(2)}
        </span>
        {isOnSale && rawCompare && (
          <span className="text-xl text-zinc-400 line-through">
            {currencySymbol}
            {rawCompare.toFixed(2)}
          </span>
        )}
        {isOnSale && discountPct && (
          <span className="text-sm font-semibold text-red-500 bg-red-50 px-2.5 py-0.5 rounded-full">
            Save {discountPct}%
          </span>
        )}
      </div>

      {/* ── Stock Availability Indicator ────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            inStock
              ? lowStock
                ? "bg-amber-400"
                : "bg-emerald-400"
              : "bg-red-400"
          }`}
        />
        <span className="text-sm font-medium text-zinc-600">
          {!inStock
            ? "Out of stock"
            : lowStock
              ? `Only ${stockQuantity} left in stock`
              : "In stock and ready to ship"}
        </span>
      </div>

      {/* ── SKU Badge ────────────────────────────────────────────────────── */}
      {effectiveSku && (
        <p className="text-xs text-zinc-400 font-mono">
          SKU: {effectiveSku}
        </p>
      )}

      {/* ── Interactive variant selector ────────────────────────────────── */}
      {hasVariants && variantOptionKeys.length > 0 && (
        <div className="flex flex-col gap-4 pt-2 border-t border-zinc-100">
          {variantOptionKeys.map((optKey) => {
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
                    const matchingVariant = product.variants.find((v) => {
                      const opts = v.options as Record<string, string>;
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
                        className={`px-3.5 py-2 text-sm border rounded-xl transition-all duration-150 ${
                          isSelected
                            ? "border-zinc-900 bg-zinc-900 text-white font-semibold shadow-sm"
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
      <div className="flex items-center gap-3 pt-2">
        <span className="text-sm font-semibold text-zinc-700">Quantity</span>
        <div className="flex items-center border border-zinc-200 rounded-xl overflow-hidden bg-white">
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
                : "bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98]"
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
