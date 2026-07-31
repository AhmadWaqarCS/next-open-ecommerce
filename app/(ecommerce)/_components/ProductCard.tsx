import Link from "next/link";
import Image from "next/image";
import type { ProductCard as ProductCardType } from "@/lib/storefront";

interface ProductCardProps {
  product: ProductCardType;
  currencySymbol?: string;
  priority?: boolean;
}

export default function ProductCard({
  product,
  currencySymbol = "$",
  priority = false,
}: ProductCardProps) {
  const price = Number(product.price);
  const comparePrice = product.compare_at_price
    ? Number(product.compare_at_price)
    : null;
  const isOnSale = comparePrice !== null && comparePrice > price;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="product-card group flex flex-col gap-3"
    >
      {/* Image */}
      <div className="relative aspect-[3/4] bg-zinc-100 rounded-xl overflow-hidden">
        {product.feature_image_url ? (
          <Image
            src={product.feature_image_url}
            alt={product.feature_image_alt_text ?? product.name}
            fill
            // unoptimized
            className="product-card-image object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-300">
            <svg
              className="w-12 h-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isOnSale && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
              Sale
            </span>
          )}
          {product.is_featured && !isOnSale && (
            <span className="bg-[var(--color-accent)] text-zinc-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
              Featured
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1">
        {product.category_name && (
          <p className="text-[11px] text-zinc-400 uppercase tracking-widest font-medium line-clamp-1">
            {product.category_name}
          </p>
        )}
        <h3 className="text-sm font-semibold text-zinc-900 group-hover:text-zinc-600 transition-colors leading-snug line-clamp-2">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="text-sm font-bold text-zinc-900">
            {currencySymbol}
            {price.toFixed(2)}
          </span>
          {isOnSale && (
            <span className="text-xs text-zinc-400 line-through">
              {currencySymbol}
              {comparePrice!.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
