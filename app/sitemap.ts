import type { MetadataRoute } from "next";
import prisma from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const siteConfig = await prisma.site_config.findFirst({
      where: { deleted_at: null },
      select: { site_url: true },
    });
    if (siteConfig?.site_url) {
      baseUrl = siteConfig.site_url;
    }
  } catch (err) {
    console.error("Failed to read site config for sitemap base URL:", err);
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

  try {
    const categories = await prisma.category.findMany({
      where: {
        deleted_at: null,
        is_active: true,
      },
      select: {
        slug: true,
        updated_at: true,
      },
    });

    for (const cat of categories) {
      routes.push({
        url: `${baseUrl}/category/${cat.slug}`,
        lastModified: cat.updated_at,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }

    const products = await prisma.product.findMany({
      where: {
        deleted_at: null,
        is_active: true,
      },
      select: {
        slug: true,
        updated_at: true,
      },
    });

    for (const prod of products) {
      routes.push({
        url: `${baseUrl}/product/${prod.slug}`,
        lastModified: prod.updated_at,
        changeFrequency: "daily",
        priority: 0.9,
      });
    }

    const pages = await prisma.site_page.findMany({
      where: {
        is_active: true,
      },
      select: {
        slug: true,
        updated_at: true,
      },
    });

    for (const page of pages) {
      routes.push({
        url: `${baseUrl}/pages/${page.slug}`,
        lastModified: page.updated_at,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch (error) {
    console.error("Error building dynamic sitemap items:", error);
  }

  return routes;
}
