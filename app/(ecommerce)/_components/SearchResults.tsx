import Link from "next/link";
import { searchProducts, getSiteConfig } from "@/lib/storefront";
import ProductCard from "./ProductCard";

interface SearchResultsProps {
  query: string;
  page: number;
}

export default async function SearchResults({
  query,
  page,
}: SearchResultsProps) {
  const [{ products, total, pageCount }, config] = await Promise.all([
    searchProducts(query, page),
    getSiteConfig(),
  ]);

  const currencySymbol = config?.currency_symbol ?? "$";

  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <svg
          className="w-12 h-12 text-zinc-300 mx-auto mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <circle cx="11" cy="11" r="7" />
          <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
        </svg>
        <h2 className="text-xl font-semibold text-zinc-700 mb-2">
          No results for &ldquo;{query}&rdquo;
        </h2>
        <p className="text-zinc-400 text-sm max-w-xs mx-auto">
          Try different keywords, or browse our categories.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-zinc-500 mb-6">
        {total} result{total !== 1 ? "s" : ""} for{" "}
        <span className="font-semibold text-zinc-800">
          &ldquo;{query}&rdquo;
        </span>
      </p>

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

      {/* Pagination */}
      {pageCount > 1 && (
        <nav
          aria-label="Search pagination"
          className="flex items-center justify-center gap-2 mt-12"
        >
          {page > 1 && (
            <Link
              href={`/search?q=${encodeURIComponent(query)}&page=${page - 1}`}
              className="px-4 py-2 text-sm border border-zinc-200 rounded-lg text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              ← Prev
            </Link>
          )}
          <span className="text-sm text-zinc-500 px-2">
            Page {page} of {pageCount}
          </span>
          {page < pageCount && (
            <Link
              href={`/search?q=${encodeURIComponent(query)}&page=${page + 1}`}
              className="px-4 py-2 text-sm border border-zinc-200 rounded-lg text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Next →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
