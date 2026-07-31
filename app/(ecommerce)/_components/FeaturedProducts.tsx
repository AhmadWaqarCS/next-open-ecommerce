"use cache";

import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { getFeaturedProducts, getSiteConfig } from "@/lib/storefront";
import ProductCard from "./ProductCard";

interface FeaturedProductsProps {
  title?: string;
  viewAllHref?: string;
  limit?: number;
}

export default async function FeaturedProducts({
  title = "Featured Products",
  viewAllHref,
  limit = 8,
}: FeaturedProductsProps) {
  cacheTag("featured-products");
  cacheLife("max");

  const [products, config] = await Promise.all([
    getFeaturedProducts(limit),
    getSiteConfig(),
  ]);

  if (products.length === 0) return null;

  const currencySymbol = config?.currency_symbol ?? "$";


  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
      <div className="flex items-baseline justify-between mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
          {title}
        </h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            View all →
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10">
        {products.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            currencySymbol={currencySymbol}
            priority={i < 4}
          />
        ))}
      </div>
    </section>
  );
}
