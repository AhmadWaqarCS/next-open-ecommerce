import { Suspense } from "react";
import type { Metadata } from "next";
import SearchResults from "../_components/SearchResults";
import FeaturedProducts from "../_components/FeaturedProducts";
import ProductCard from "../_components/ProductCard";

// Sanitize search query: trim, max 100 chars, strip non-printable chars
function sanitizeQuery(raw: string | undefined | null): string {
  if (!raw) return "";
  return raw
    .trim()
    .slice(0, 100)
    .replace(/[^\p{L}\p{N}\p{Z}\p{P}]/gu, "") // keep letters, numbers, spaces, punctuation
    .trim();
}

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const query = sanitizeQuery(q);
  if (!query) {
    return { title: "Search", robots: { index: false } };
  }
  return {
    title: `Search: "${query}"`,
    description: `Search results for "${query}"`,
    robots: { index: false }, // never index search result pages
  };
}

// Loading skeleton for Suspense fallback
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

async function SearchPageInner({ searchParams }: SearchPageProps) {
  const { q, page: pageParam } = await searchParams;
  const query = sanitizeQuery(q);
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  return (
    <div className="page-enter">
      {/* Dark banner so the transparent header text stays visible */}
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

      {/* Results */}
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

      {/* Featured products — always cached even on a dynamic page */}
      <div className="border-t border-zinc-100">
        <FeaturedProducts title="Popular Products" limit={4} />
      </div>
    </div>
  );
}

export default function SearchPage(props: SearchPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SearchPageInner {...props} />
    </Suspense>
  );
}
