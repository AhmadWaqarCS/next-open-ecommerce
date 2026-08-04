"use cache";

import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import {
  getProductPageData,
  getTopProductSlugs,
} from "@/lib/storefront";
import ProductDetailMain from "./ProductDetailMain";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getTopProductSlugs(1);
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
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

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  cacheTag(`product-${slug}`, "products");
  cacheLife("max");

  const productPageData = await getProductPageData(slug);

  return <ProductDetailMain content={productPageData} />;
}
