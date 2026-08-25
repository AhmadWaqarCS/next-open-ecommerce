"use cache";

import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { getHomePageData } from "@/lib/storefront";
import { loadThemeComponent } from "@/lib/theme-loader";
import HeroBanner from "./_components/HeroBanner";
import HeroCarousel from "./_components/HeroCarousel";
import FeaturedProducts from "./_components/FeaturedProducts";
import CategoryCarousel from "./_components/CategoryCarousel";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getHomePageData();
  const meta = data.meta_info || {};
  const title = meta.title ?? data.pageTitle ?? "Home";
  const description = meta.description ?? undefined;
  const keywords = meta.keywords ?? undefined;
  const ogTitle = meta.og_title ?? title;
  const ogDescription = meta.og_description ?? description;
  const ogImage = meta.og_image ?? undefined;

  return {
    title,
    description,
    keywords,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
  };
}

export default async function EcommerceHomePage() {
  cacheTag("home-page");
  cacheLife("max");

  const data = await getHomePageData();

  // If a custom theme component is selected, render it directly
  if (data.customThemeComponent?.theme_name && data.customThemeComponent?.component_path) {
    const CustomHome = await loadThemeComponent(
      data.customThemeComponent.theme_name,
      data.customThemeComponent.component_path,
    );
    if (CustomHome) {
      return (
        <>
          {data.custom_css && (
            <style dangerouslySetInnerHTML={{ __html: data.custom_css }} />
          )}
          <CustomHome
            content={data}
            themeConfig={data.customThemeComponent.theme_config}
          />
        </>
      );
    }
  }

  return (
    <div className="page-enter">
      {data.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: data.custom_css }} />
      )}
      {/* ── Hero / First Impression Section ───────────────────────────── */}
      {data.heroType === "hero-carousel" ? (
        <HeroCarousel
          heroCarouselProps={data.heroCarouselProps}
          homeCategories={data.homeCategories}
        />
      ) : (
        <HeroBanner
          heroBannerProps={data.heroBannerProps}
          homeCategories={data.homeCategories}
        />
      )}

      {/* ── Featured Products Section ─────────────────────────────────── */}
      <FeaturedProducts limit={data.featuredProductsConfig.limit} />

      {/* ── Category Carousel Section ─────────────────────────────────── */}
      <CategoryCarousel
        carousels={data.categoryCarousels}
        config={data.categoryCarouselConfig}
      />
    </div>
  );
}
