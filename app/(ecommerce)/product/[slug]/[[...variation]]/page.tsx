"use cache";

import { cacheLife, cacheTag } from "next/cache";
import { getProductPageData, getProductPageSlugs } from "@/lib/storefront";
import ProductDetailMain from "../../ProductDetailMain";

interface ProductPageProps {
  params: Promise<{ slug: string; variation?: string[] }>;
}

export async function generateStaticParams() {
  const slugs = await getProductPageSlugs(1);
  return slugs.map((slug: string) => ({ slug, variation: [] }));
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug, variation } = await params;
  const variationIdParam = variation && variation.length > 0 ? variation[0] : undefined;

  cacheTag(`product-${slug}`);
  cacheLife("max");

  const productPageData = await getProductPageData(slug);

  return (
    <ProductDetailMain
      content={productPageData}
      initialVariationParam={variationIdParam}
    />
  );
}
