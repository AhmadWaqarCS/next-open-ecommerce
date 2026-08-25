import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";
import prisma from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheTag("sitemap");
  cacheLife("max");

  let baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const { siteConfig, categories, products, pages } = await prisma.$transaction(async (tx) => {
      const siteConfig = await tx.site_config.findFirst({
        where: { deleted_at: null },
        select: { site_url: true },
      });
      const categories = await tx.category.findMany({
        where: { deleted_at: null, is_active: true },
        select: { slug: true, updated_at: true },
      });
      const products = await tx.product.findMany({
        where: { deleted_at: null, is_active: true },
        select: { slug: true, updated_at: true },
      });
      const pages = await tx.site_page.findMany({
        where: { is_active: true },
        select: { slug: true, updated_at: true },
      });

      return { siteConfig, categories, products, pages };
    });

    if (siteConfig?.site_url) {
      baseUrl = siteConfig.site_url;
    }

    baseUrl = baseUrl.replace(/\/$/, "");

    const routes: MetadataRoute.Sitemap = [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 1.0,
      },
      {
        url: `${baseUrl}/about`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.5,
      },
      {
        url: `${baseUrl}/contact`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.5,
      },
      {
        url: `${baseUrl}/search`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      },
    ];

    for (const cat of categories) {
      routes.push({
        url: `${baseUrl}/category/${cat.slug}`,
        lastModified: cat.updated_at,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }

    for (const prod of products) {
      routes.push({
        url: `${baseUrl}/product/${prod.slug}`,
        lastModified: prod.updated_at,
        changeFrequency: "daily",
        priority: 0.9,
      });
    }

    for (const page of pages) {
      if (
        page.slug === "/" ||
        page.slug.includes("[slug]") ||
        page.slug === "about" ||
        page.slug === "contact" ||
        page.slug === "search"
      ) {
        continue;
      }
      routes.push({
        url: `${baseUrl}/${page.slug}`,
        lastModified: page.updated_at,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }

    return routes;
  } catch (error) {
    console.error("Error building dynamic sitemap items:", error);
    baseUrl = baseUrl.replace(/\/$/, "");
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 1.0,
      },
    ];
  }
}
