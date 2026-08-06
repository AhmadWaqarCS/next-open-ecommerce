import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ProductFull } from "@/lib/storefront";
import AddToCartButton from "../_components/AddToCartButton";
import CartProvider from "../_components/CartProvider";
import FeaturedProducts from "../_components/FeaturedProducts";

export interface ProductDetailMainProps {
  content: { product: ProductFull | null };
  initialVariationParam?: string;
}

const productDetailScopedStyles = `
  .product-gallery-thumb {
    transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .product-gallery-main {
    transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
  }
`;

/**
 * ProductDetailMain — Page-Specific Main Component for Product Detail View.
 * Located at `app/(ecommerce)/product/ProductDetailMain.tsx`.
 */
export default function ProductDetailMain({
  content,
  initialVariationParam,
}: ProductDetailMainProps) {
  const { product } = content;
  const currencySymbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$";

  if (!product) {
    notFound();
  }

  // Inline fallbacks
  const name = product.meta_info?.title || product.name || "Product Details";
  const shortDescription = product.short_description || null;
  const description = product.description || null;

  // Gallery compilation: feature_image_url first, followed by additional images
  const galleryImages: { url: string; alt: string }[] = [];
  if (product.feature_image_url) {
    galleryImages.push({
      url: product.feature_image_url,
      alt: product.feature_image_alt_text ?? name,
    });
  }
  for (const img of product.images) {
    if (img.url !== product.feature_image_url) {
      galleryImages.push({ url: img.url, alt: img.alt_text ?? name });
    }
  }

  return (
    <div className="page-enter">
      <style dangerouslySetInnerHTML={{ __html: productDetailScopedStyles }} />

      {/* ── Breadcrumb Header ────────────────────────────────────────────── */}
      <div className="bg-zinc-950 relative overflow-hidden border-b border-zinc-800/40">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-900/30 to-zinc-950" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
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
              <li className="text-white/80 font-medium line-clamp-1">{name}</li>
            </ol>
          </nav>
        </div>
      </div>

      {/* ── Product Main Showcase Grid ───────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Gallery Column */}
          <div className="flex flex-col gap-3">
            {/* Main Featured Image */}
            <div className="relative aspect-square bg-zinc-100 rounded-2xl overflow-hidden shadow-sm">
              {galleryImages[0] ? (
                <Image
                  src={galleryImages[0].url}
                  alt={galleryImages[0].alt}
                  fill
                  className="product-gallery-main object-cover"
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
            </div>

            {/* Thumbnail Strip */}
            {galleryImages.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {galleryImages.slice(1).map((img, i) => (
                  <div
                    key={i}
                    className="product-gallery-thumb relative w-20 h-20 bg-zinc-100 rounded-xl overflow-hidden border-2 border-transparent hover:border-zinc-400 cursor-pointer"
                  >
                    <Image
                      src={img.url}
                      alt={img.alt}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Details & Call to Action Column */}
          <div className="flex flex-col gap-6">
            {/* Category + Title */}
            <div>
              {product.category_name && (
                <p className="text-xs text-zinc-400 uppercase tracking-widest font-medium mb-2">
                  {product.category_name}
                </p>
              )}
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 leading-tight">
                {name}
              </h1>
            </div>

            {/* Short Description */}
            {shortDescription && (
              <p className="text-zinc-600 text-base leading-relaxed">
                {shortDescription}
              </p>
            )}

            {/* Interactive Add to Cart & Variation Section */}
            <CartProvider>
              <AddToCartButton
                product={product}
                currencySymbol={currencySymbol}
                initialVariationParam={initialVariationParam}
              />
            </CartProvider>

            {/* Comprehensive Description */}
            {description && (
              <div className="pt-6 border-t border-zinc-100">
                <h2 className="text-xs font-semibold text-zinc-700 uppercase tracking-widest mb-3">
                  Description
                </h2>
                <div className="text-sm text-zinc-600 leading-relaxed whitespace-pre-line">
                  {description}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Featured Products Block ("You Might Also Like") ──────────────── */}
      <div className="border-t border-zinc-100">
        <FeaturedProducts />
      </div>
    </div>
  );
}
