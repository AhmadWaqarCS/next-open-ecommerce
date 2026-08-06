"use cache";

import { cacheLife, cacheTag } from "next/cache";
import { getCategoryPageData, getCategorySlugs } from "@/lib/storefront";
import { Metadata } from "next";

interface CategoryLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string; page?: string[] }>;
}

export async function generateStaticParams() {
  const slugs = await getCategorySlugs(1);
  return slugs.map((slug: string) => ({ slug, page: [] }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; page?: string[] }>;
}): Promise<Metadata> {
  const { slug, page: pageArr } = await params;
  const page = pageArr && pageArr.length > 0 ? Math.max(1, parseInt(pageArr[0], 10) || 1) : 1;

  cacheTag(`category-${slug}`);
  cacheLife("max");

  const { category } = await getCategoryPageData(slug, page);
  if (!category) return { title: "Category Not Found" };
  const meta = category.meta_info;
  const baseTitle = meta.title ?? category.name;

  return {
    title: page > 1 ? `${baseTitle} - Page ${page}` : baseTitle,
    description: meta.description ?? category.description ?? undefined,
  };
}

export default async function CategoryLayout({
  children,
  params,
}: CategoryLayoutProps) {
  const { slug } = await params;
  cacheTag(`category-${slug}`);
  cacheLife("max");

  return <>{children}</>;
}
