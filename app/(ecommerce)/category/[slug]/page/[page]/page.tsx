"use cache";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCategoryPageData } from "@/lib/storefront";
import CategoryPageMain from "../../CategoryPageMain";
import { cacheLife, cacheTag } from "next/cache";

interface PaginatedCategoryPageProps {
  params: Promise<{ slug: string; page: string }>;
}

export async function generateMetadata({
  params,
}: PaginatedCategoryPageProps): Promise<Metadata> {
  const { slug, page: pageStr } = await params;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
  const { category } = await getCategoryPageData(slug, page);
  if (!category) return { title: "Category Not Found" };
  const meta = category.meta_info;
  const baseTitle = meta.title ?? category.name;
  return {
    title: page > 1 ? `${baseTitle} - Page ${page}` : baseTitle,
    description: meta.description ?? category.description ?? undefined,
  };
}

export default async function PaginatedCategoryPage({
  params,
}: PaginatedCategoryPageProps) {
  const { slug, page: pageStr } = await params;
  const page = parseInt(pageStr, 10);

  if (isNaN(page) || page <= 1) {
    redirect(`/category/${slug}`);
  }

  cacheTag(`category-${slug}`);
  cacheLife("max");

  return <CategoryPageMain slug={slug} page={page} />;
}
