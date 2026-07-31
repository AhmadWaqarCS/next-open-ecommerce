"use cache";

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import {
  getProductBySlug,
  getSiteConfig,
  getTopProductSlugs,
} from "@/lib/storefront";
import ProductDetail from "../../_components/ProductDetail";
import FeaturedProducts from "../../_components/FeaturedProducts";

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
  const product = await getProductBySlug(slug);
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

  const [product, config] = await Promise.all([
    getProductBySlug(slug),
    getSiteConfig(),
  ]);

  if (!product) notFound();

  const currencySymbol = config?.currency_symbol ?? "$";

  return (
    <div className="page-enter">
      <ProductDetail product={product} currencySymbol={currencySymbol} />
      <div className="border-t border-zinc-100">
        <FeaturedProducts title="You Might Also Like" limit={4} />
      </div>
    </div>
  );
}
