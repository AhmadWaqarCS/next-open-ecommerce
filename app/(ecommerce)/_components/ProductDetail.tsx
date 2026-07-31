import Image from "next/image";
import Link from "next/link";
import type { ProductFull } from "@/lib/storefront";
import AddToCartButton from "./AddToCartButton";
import { Suspense } from "react";
import CartProvider from "./CartProvider";

interface ProductDetailProps {
  product: ProductFull;
  currencySymbol?: string;
}

export default function ProductDetail({
  product,
  currencySymbol = "$",
}: ProductDetailProps) {
  const price = Number(product.price);
  const comparePrice = product.compare_at_price
    ? Number(product.compare_at_price)
    : null;
  const isOnSale = comparePrice !== null && comparePrice > price;
  const discountPct = isOnSale
    ? Math.round(((comparePrice! - price) / comparePrice!) * 100)
    : null;

  const inStock = !product.track_inventory || product.stock_quantity > 0;
  const lowStock =
    product.track_inventory &&
    product.stock_quantity > 0 &&
    product.stock_quantity <= product.low_stock_threshold;

  // Gallery: feature_image_url first, then additional images
  const galleryImages: { url: string; alt: string }[] = [];
  if (product.feature_image_url) {
    galleryImages.push({
      url: product.feature_image_url,
      alt: product.feature_image_alt_text ?? product.name,
    });
  }
  for (const img of product.images) {
    if (img.url !== product.feature_image_url) {
      galleryImages.push({ url: img.url, alt: img.alt_text ?? product.name });
    }
  }

  return (
    <div>
      {/* Dark banner so the transparent header text stays visible */}
      <div className="bg-gradient-to-br from-zinc-800 to-zinc-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm text-white/60">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              {product.category_name && (
                <>
                  <li className="text-white/40">/</li>
                  <li>
                    <span className="text-white/60">
                      {product.category_name}
                    </span>
                  </li>
                </>
              )}
              <li className="text-white/40">/</li>
              <li className="text-white/80 font-medium line-clamp-1">
                {product.name}
              </li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Gallery */}
          <div className="flex flex-col gap-3">
            {/* Main image */}
            <div className="relative aspect-square bg-zinc-100 rounded-2xl overflow-hidden">
              {galleryImages[0] ? (
                <Image
                  src={galleryImages[0].url}
                  alt={galleryImages[0].alt}
                  fill
                  // unoptimized
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-300">
                  <svg
                    className="w-20 h-20"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={0.75}
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </div>
              )}
              {isOnSale && discountPct && (
                <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  -{discountPct}%
                </span>
              )}
            </div>

            {/* Thumbnail strip */}
            {galleryImages.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {galleryImages.slice(1).map((img, i) => (
                  <div
                    key={i}
                    className="relative w-20 h-20 bg-zinc-100 rounded-xl overflow-hidden border-2 border-transparent hover:border-zinc-300 transition-colors"
                  >
                    <Image
                      src={img.url}
                      alt={img.alt}
                      fill
                      // unoptimized
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="flex flex-col gap-6">
            {/* Category + Name */}
            <div>
              {product.category_name && (
                <p className="text-xs text-zinc-400 uppercase tracking-widest font-medium mb-2">
                  {product.category_name}
                </p>
              )}
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 leading-tight">
                {product.name}
              </h1>
            </div>

            {/* Pricing */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-zinc-900">
                {currencySymbol}
                {price.toFixed(2)}
              </span>
              {isOnSale && (
                <span className="text-xl text-zinc-400 line-through">
                  {currencySymbol}
                  {comparePrice!.toFixed(2)}
                </span>
              )}
              {isOnSale && discountPct && (
                <span className="text-sm font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                  Save {discountPct}%
                </span>
              )}
            </div>

            {/* Short description */}
            {product.short_description && (
              <p className="text-zinc-600 text-base leading-relaxed">
                {product.short_description}
              </p>
            )}

            {/* Stock status */}
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  inStock
                    ? lowStock
                      ? "bg-amber-400"
                      : "bg-emerald-400"
                    : "bg-red-400"
                }`}
              />
              <span className="text-sm text-zinc-600">
                {!inStock
                  ? "Out of stock"
                  : lowStock
                    ? `Only ${product.stock_quantity} left`
                    : "In stock"}
              </span>
            </div>

            {/* SKU */}
            {product.sku && (
              <p className="text-xs text-zinc-400">SKU: {product.sku}</p>
            )}

            {/* Add to Cart */}
            <Suspense>
              <CartProvider>
                <AddToCartButton
                  product={product}
                  currencySymbol={currencySymbol}
                />
              </CartProvider>
            </Suspense>

            {/* Full description */}
            {product.description && (
              <div className="pt-4 border-t border-zinc-100">
                <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-3">
                  Description
                </h2>
                <div className="text-sm text-zinc-600 leading-relaxed whitespace-pre-line">
                  {product.description}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
