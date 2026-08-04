import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { getAllCategorySlugs, getCategoryPageData } from "@/lib/storefront";
import CategoryPageMain from "./CategoryPageMain";

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
  const { category } = await getCategoryPageData(slug, 1);
  if (!category) return { title: "Category Not Found" };
  const meta = category.meta_info;
  return {
    title: meta.title ?? category.name,
    description: meta.description ?? category.description ?? undefined,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  return <CategoryPageMain slug={slug} page={page} />;
}
