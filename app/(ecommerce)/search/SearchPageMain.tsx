import { Suspense } from "react";
import SearchResults from "../_components/SearchResults";
import FeaturedProducts from "../_components/FeaturedProducts";

export interface SearchPageMainProps {
  query: string;
  page: number;
}

const searchPageScopedStyles = `
  .search-banner-gradient {
    background: linear-gradient(135deg, rgba(39, 39, 42, 0.95), rgba(9, 9, 11, 0.98));
  }
`;

function SearchSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="skeleton aspect-[3/4] rounded-xl" />
          <div className="skeleton h-3 w-1/3 rounded" />
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-4 w-1/4 rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * SearchPageMain — Page-Specific Main Component for Search Results.
 * Located beside `app/(ecommerce)/search/page.tsx`.
 */
export default function SearchPageMain({ query, page }: SearchPageMainProps) {
  return (
    <div className="page-enter">
      <style dangerouslySetInnerHTML={{ __html: searchPageScopedStyles }} />

      {/* ── Search Hero Banner ──────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-zinc-800 to-zinc-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
          <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight mb-3">
            {query ? (
              <>
                Results for{" "}
                <span className="text-white/60">&ldquo;{query}&rdquo;</span>
              </>
            ) : (
              "Search"
            )}
          </h1>
          {!query && (
            <p className="text-white/60 text-lg">
              Enter a search term in the header to find products.
            </p>
          )}
        </div>
      </div>

      {/* ── Results Container ────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {query ? (
          <Suspense fallback={<SearchSkeleton />}>
            <SearchResults query={query} page={page} />
          </Suspense>
        ) : (
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
            <p className="text-zinc-400 text-lg">What are you looking for?</p>
          </div>
        )}
      </div>

      {/* ── Featured Products Block ("Popular Products") ──────────────────── */}
      <div className="border-t border-zinc-100">
        <FeaturedProducts />
      </div>
    </div>
  );
}
