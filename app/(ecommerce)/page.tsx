"use cache";

import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { getPageData } from "@/lib/storefront";
import HeroBanner from "./_components/HeroBanner";
import FeaturedProducts from "./_components/FeaturedProducts";

export async function generateMetadata(): Promise<Metadata> {
  const pageRes = await getPageData("/");
  const page = pageRes?.page;
  const meta = page?.meta_info ?? {};
  return {
    title: meta.title ?? page?.title ?? "Home",
    description: meta.description ?? undefined,
  };
}

export default async function EcommerceHomePage() {
  cacheTag("home-page");
  cacheLife("max");

  return (
    <div className="page-enter">
      {/* ── Hero / First Impression Section ───────────────────────────── */}
      <HeroBanner />

      {/* ── Featured Products Section ─────────────────────────────────── */}
      <FeaturedProducts />
    </div>
  );
}
