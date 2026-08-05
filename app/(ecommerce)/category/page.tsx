"use cache";

import type { Metadata } from "next";
import { getAllCategoriesPageData, getPageData } from "@/lib/storefront";
import AllCategoriesMain from "./AllCategoriesMain";
import { cacheLife, cacheTag } from "next/cache";

export async function generateMetadata(): Promise<Metadata> {
  const { page } = await getPageData("category");
  const meta = page?.meta_info;
  return {
    title: meta?.title ?? page?.title ?? "All Categories",
    description:
      meta?.description ?? "Browse all product categories in our store.",
  };
}

export default async function CategoriesPage() {
  cacheTag("page-categories");
  cacheLife("max");

  const [data, { page }] = await Promise.all([
    getAllCategoriesPageData(),
    getPageData("category"),
  ]);

  const title = page?.title ?? "All Categories";
  const description = page?.meta_info?.description;

  return (
    <AllCategoriesMain
      categories={data.categories}
      siteName="Store"
      title={title}
      description={description}
    />
  );
}
