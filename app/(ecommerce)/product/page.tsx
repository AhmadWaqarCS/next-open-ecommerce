"use cache";

import Link from "next/link";
import type { Metadata } from "next";
import { getFeaturedProducts, getPageData } from "@/lib/storefront";
import { cacheLife, cacheTag } from "next/cache";
import ProductCard from "../_components/ProductCard";

export async function generateMetadata(): Promise<Metadata> {
  const { page } = await getPageData("product");
  const meta = page?.meta_info;
  return {
    title: meta?.title ?? page?.title ?? "All Products",
    description: meta?.description ?? "Browse all products in our store.",
  };
}

export default async function ProductsPage() {
  cacheTag("page-products");
  cacheLife("max");

  const [{ products }, { page }] = await Promise.all([
    getFeaturedProducts(24),
    getPageData("product"),
  ]);
  const currencySymbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$";

  const title = page?.title ?? "All Products";
  const description =
    page?.meta_info?.description ?? "Browse our full collection.";

  return (
    <div className="page-enter">
      {/* Dark banner so the transparent header text stays visible */}
      <div className="bg-gradient-to-br from-zinc-800 to-zinc-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
          {/* Breadcrumb */}
          <nav className="mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm text-white/60">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li className="text-white/40">/</li>
              <li className="text-white/80 font-medium">{title}</li>
            </ol>
          </nav>
          <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight mb-3">
            {title}
          </h1>
          <p className="text-white/60 text-lg">{description}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {products.length === 0 ? (
          <p className="text-zinc-400">No products found.</p>
        ) : (
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
        )}
      </div>
    </div>
  );
}
