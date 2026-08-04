"use cache";

import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { getShopCategoriesWithCount, getSiteConfig } from "@/lib/storefront";
import AllCategoriesMain from "./AllCategoriesMain";

export const metadata: Metadata = {
  title: "All Categories",
  description: "Browse all product categories in our store.",
};

export default async function CategoriesPage() {
  cacheTag("site-config", "categories", "shop-categories");
  cacheLife("max");

  const [categories, config] = await Promise.all([
    getShopCategoriesWithCount(),
    getSiteConfig(),
  ]);

  return (
    <AllCategoriesMain
      categories={categories}
      siteName={config?.name || "Store"}
    />
  );
}
