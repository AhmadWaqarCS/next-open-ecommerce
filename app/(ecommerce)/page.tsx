"use cache";

import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import {
  getHeroBannerData,
  getSiteFeaturesData,
  getSiteConfig,
} from "@/lib/storefront";
import HeroBanner from "./HeroBanner";
import CategorySwiper from "./CategorySwiper";
import FeaturedProducts from "./_components/FeaturedProducts";
import SiteFeatures from "./_components/SiteFeatures";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  if (!config) return {};
  const meta = config.meta_info;
  return {
    title: meta.title ?? config.name,
    description: meta.description ?? config.description ?? undefined,
  };
}

export default async function EcommerceHomePage() {
  cacheTag("categories", "shop-categories", "featured-products");
  cacheLife("max");

  const [heroData, siteFeaturesData] = await Promise.all([
    getHeroBannerData(),
    getSiteFeaturesData(),
  ]);

  return (
    <div className="page-enter">
      {/* ── Hero / First Impression Section ───────────────────────────── */}
      <HeroBanner content={heroData} />

      {/* ── Shop by Category Section ──────────────────────────────────── */}
      <CategorySwiper content={heroData.categories} />

      {/* ── Featured Products Section ─────────────────────────────────── */}
      <FeaturedProducts title="Featured Products" limit={8} />

      {/* ── Value Propositions & Site Features Section ────────────────── */}
      <SiteFeatures content={siteFeaturesData} />
    </div>
  );
}
