"use cache";

import { redirect } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { getCategoryPageData, getCategorySlugs, getPageThemeConfig } from "@/lib/storefront";
import { loadThemeComponent } from "@/lib/theme-loader";
import CategoryPageMain from "../CategoryPageMain";

interface PaginatedCategoryPageProps {
  params: Promise<{ slug: string; page?: string[] }>;
}

export async function generateStaticParams() {
  const slugs = await getCategorySlugs(1);
  return slugs.map((slug: string) => ({ slug, page: [] }));
}

export default async function PaginatedCategoryPage({
  params,
}: PaginatedCategoryPageProps) {
  const { slug, page: pageArr } = await params;
  const pageStr = pageArr && pageArr.length > 0 ? pageArr[0] : undefined;

  // If URL is explicitly /category/slug/1, redirect to canonical /category/slug
  if (pageStr === "1") {
    redirect(`/category/${slug}`);
  }

  const page = pageStr ? parseInt(pageStr, 10) : 1;

  if (isNaN(page) || page < 1) {
    redirect(`/category/${slug}`);
  }

  cacheTag(`category-${slug}`);
  cacheLife("max");

  const [data, pageThemeCfg] = await Promise.all([
    getCategoryPageData(slug, page),
    getPageThemeConfig(["category/[slug]", "category"]),
  ]);
  if (pageThemeCfg.theme_name && pageThemeCfg.component_path) {
    const CustomCategory = await loadThemeComponent(
      pageThemeCfg.theme_name,
      pageThemeCfg.component_path,
    );
    if (CustomCategory) {
      return (
        <>
          {pageThemeCfg.custom_css && (
            <style dangerouslySetInnerHTML={{ __html: pageThemeCfg.custom_css }} />
          )}
          <CustomCategory data={data} themeConfig={pageThemeCfg.theme_config} />
        </>
      );
    }
  }

  return (
    <>
      {pageThemeCfg.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: pageThemeCfg.custom_css }} />
      )}
      <CategoryPageMain data={data} />
    </>
  );
}
