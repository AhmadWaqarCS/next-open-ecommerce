import Link from "next/link";
import { notFound } from "next/navigation";
import type { CategoryPageData } from "@/lib/storefront";
import ProductCard from "../../_components/ProductCard";
import FeaturedProducts from "../../_components/FeaturedProducts";

export interface CategoryPageMainProps {
  data: CategoryPageData;
}

const categoryPageScopedStyles = `
  .category-hero-gradient {
    background: linear-gradient(135deg, rgba(24, 24, 27, 0.95), rgba(9, 9, 11, 0.98));
  }
  .pagination-link {
    transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  }
`;

/**
 * CategoryPageMain — Consolidated Page Component for Category Views.
 * Located beside `app/(ecommerce)/category/[slug]/page.tsx`.
 */
export default function CategoryPageMain({ data }: CategoryPageMainProps) {
  const { category, products, total, page, pageCount } = data;
  const currencySymbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$";

  if (!category) {
    notFound();
  }

  const slug = category.slug;

  // Inline fallbacks
  const name = category.meta_info?.title || category.name || "Category";
  const description =
    category.meta_info?.description ||
    category.description ||
    "Explore our curated selection of high quality items.";

  const bgClass = category.bg_color?.includes("bg-")
    ? category.bg_color
    : `bg-gradient-to-br ${category.bg_color ?? "from-zinc-800 to-zinc-950"}`;

  return (
    <div className="page-enter">
      <style dangerouslySetInnerHTML={{ __html: categoryPageScopedStyles }} />

      {/* ── Category Hero Header ────────────────────────────────────────── */}
      <div className={`${bgClass} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
          {/* Breadcrumbs */}
          <nav className="mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm text-white/60">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li className="text-white/40">/</li>
              <li>
                <Link
                  href="/category"
                  className="hover:text-white transition-colors"
                >
                  Categories
                </Link>
              </li>
              <li className="text-white/40">/</li>
              <li className="text-white/80 font-medium">{name}</li>
            </ol>
          </nav>

          <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight mb-3">
            {name}
          </h1>
          <p className="text-white/70 text-lg max-w-xl leading-relaxed">
            {description}
          </p>
          <p className="text-white/50 text-sm mt-4">
            {total} product{total !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* ── Product Cards Grid Section ───────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-400 text-lg mb-2">
              No products found in this category.
            </p>
            <Link
              href="/category"
              className="text-sm text-zinc-500 hover:text-zinc-800 underline underline-offset-4 transition-colors"
            >
              Browse all categories
            </Link>
          </div>
        ) : (
          <>
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

            {/* Pagination Controls */}
            {pageCount > 1 && (
              <nav
                aria-label="Category pagination"
                className="flex items-center justify-center gap-2 mt-14"
              >
                {page > 1 && (
                  <Link
                    href={
                      page - 1 === 1
                        ? `/category/${slug}`
                        : `/category/${slug}/page/${page - 1}`
                    }
                    className="pagination-link px-4 py-2 text-sm border border-zinc-200 rounded-lg text-zinc-700 hover:bg-zinc-50"
                  >
                    ← Previous
                  </Link>
                )}

                <div className="flex items-center gap-1">
                  {Array.from({ length: pageCount }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 || p === pageCount || Math.abs(p - page) <= 1,
                    )
                    .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1)
                        acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, i) =>
                      item === "..." ? (
                        <span
                          key={`ellipsis-${i}`}
                          className="px-2 text-zinc-400 text-sm"
                        >
                          …
                        </span>
                      ) : (
                        <Link
                          key={item}
                          href={
                            item === 1
                              ? `/category/${slug}`
                              : `/category/${slug}/page/${item}`
                          }
                          className={`pagination-link w-9 h-9 flex items-center justify-center text-sm rounded-lg ${
                            item === page
                              ? "bg-zinc-900 text-white font-medium"
                              : "text-zinc-600 hover:bg-zinc-100"
                          }`}
                        >
                          {item}
                        </Link>
                      ),
                    )}
                </div>

                {page < pageCount && (
                  <Link
                    href={`/category/${slug}/page/${page + 1}`}
                    className="pagination-link px-4 py-2 text-sm border border-zinc-200 rounded-lg text-zinc-700 hover:bg-zinc-50"
                  >
                    Next →
                  </Link>
                )}
              </nav>
            )}
          </>
        )}
      </div>

      {/* ── Featured Products Block ("You Might Also Like") ──────────────── */}
      <div className="border-t border-zinc-100">
        <FeaturedProducts />
      </div>
    </div>
  );
}
