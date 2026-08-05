"use cache";

import type { Metadata } from "next";
import { getCategorySlugs, getCategoryPageData } from "@/lib/storefront";
import CategoryPageMain from "./CategoryPageMain";
import { cacheLife, cacheTag } from "next/cache";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getCategorySlugs(1);
  return slugs.map((slug: string) => ({ slug }));
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

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  cacheTag(`category-${slug}`);
  cacheLife("max");
  return <CategoryPageMain slug={slug} page={1} />;
}

