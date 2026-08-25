"use cache";

import { cacheLife, cacheTag } from "next/cache";
import {
  getProductPageData,
  getProductPageSlugs,
  getPageThemeConfig,
} from "@/lib/storefront";
import { loadThemeComponent } from "@/lib/theme-loader";
import ProductDetailMain from "../../ProductDetailMain";
import FeaturedProducts from "@/app/(ecommerce)/_components/FeaturedProducts";

interface ProductPageProps {
  params: Promise<{ slug: string; variation?: string[] }>;
}

export async function generateStaticParams() {
  const slugs = await getProductPageSlugs(1);
  return slugs.map((slug: string) => ({ slug, variation: [] }));
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug, variation } = await params;
  const variationParam =
    variation && variation.length > 0 ? variation.join("/") : "";

  cacheTag(`product-${slug}`);
  cacheLife("max");

  const [productPageData, pageThemeCfg] = await Promise.all([
    getProductPageData(slug),
    getPageThemeConfig(["product/[slug]", "product"]),
  ]);

  if (pageThemeCfg.theme_name && pageThemeCfg.component_path) {
    const CustomProduct = await loadThemeComponent(
      pageThemeCfg.theme_name,
      pageThemeCfg.component_path,
    );
    if (CustomProduct) {
      return (
        <>
          {pageThemeCfg.custom_css && (
            <style
              dangerouslySetInnerHTML={{ __html: pageThemeCfg.custom_css }}
            />
          )}
          <CustomProduct
            content={productPageData}
            themeConfig={pageThemeCfg.theme_config}
            initialVariationParam={variationParam}
          />
        </>
      );
    }
  }

  return (
    <>
      {pageThemeCfg.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: pageThemeCfg.custom_css }} />
      )}
      <ProductDetailMain
        content={productPageData}
        initialVariationParam={variationParam}
      />
      <FeaturedProducts />
    </>
  );
}
