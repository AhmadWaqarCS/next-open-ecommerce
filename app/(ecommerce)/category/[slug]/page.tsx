import { Suspense } from "react";
import type { Metadata } from "next";
import { getAllCategorySlugs, getCategoryProducts } from "@/lib/storefront";
import CategoryContent from "./CategoryContent";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateStaticParams() {
  const slugs = await getAllCategorySlugs(1);
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { category } = await getCategoryProducts(slug, 1);
  if (!category) return { title: "Category Not Found" };
  const meta = category.meta_info;
  return {
    title: meta.title ?? category.name,
    description: meta.description ?? category.description ?? undefined,
  };
}

async function CategoryPageInner({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  return <CategoryContent slug={slug} page={page} />;
}

export default function CategoryPage(props: CategoryPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CategoryPageInner {...props} />
    </Suspense>
  );
}
