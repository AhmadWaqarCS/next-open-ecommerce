import { Suspense } from "react";
import type { Metadata } from "next";
import SearchPageMain from "./SearchPageMain";

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

async function SearchPageInner({ searchParams }: SearchPageProps) {
  const { q, page: pageParam } = await searchParams;
  const query = sanitizeQuery(q);
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  return <SearchPageMain query={query} page={page} />;
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
