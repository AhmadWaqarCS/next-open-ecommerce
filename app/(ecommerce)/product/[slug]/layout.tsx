"use cache";

import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { getProductPageData, getProductPageSlugs } from "@/lib/storefront";

interface ProductLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getProductPageSlugs(1);
  return slugs.map((slug: string) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const { product } = await getProductPageData(slug);
  if (!product) return { title: "Product Not Found" };

  const meta = product.meta_info;
  return {
    title: meta.title ?? product.name,
    description: meta.description ?? product.short_description ?? undefined,
    openGraph: {
      title: meta.title ?? product.name,
      description: meta.description ?? product.short_description ?? undefined,
      images: product.feature_image_url
        ? [{ url: product.feature_image_url }]
        : [],
    },
  };
}

export default async function ProductLayout({
  children,
  params,
}: ProductLayoutProps) {
  const { slug } = await params;
  cacheTag(`product-${slug}`);
  cacheLife("max");

  return <>{children}</>;
}
