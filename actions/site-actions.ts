"use server";

import fs from "fs/promises";
import path from "path";
import prisma from "@/lib/prisma";
import { ActionResponse, formatZodErrors } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import {
  SiteConfigCreateInput,
  SiteConfigUpdateInput,
  SitePageCreateInput,
  SitePageUpdateInput,
  siteConfigCreateSchema,
  siteConfigUpdateSchema,
  sitePageCreateSchema,
  sitePageUpdateSchema,
} from "@/lib/validations";
import {
  createSiteConfigInDB,
  createSitePageInDB,
  deleteSitePagePermanentlyInDB,
  updateSiteConfigInDB,
  updateSitePageInDB,
  getSiteConfigForRevalidationInDB,
} from "@/services/site-services";
import { revalidatePath, revalidateTag } from "next/cache";

// ─── SITE CONFIG ──────────────────────────────────────────────────────────────

export async function createSiteConfig(
  data: SiteConfigCreateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("create", "/dashboard/settings");

  const validatedFields = siteConfigCreateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const {
    name,
    tagline,
    description,
    site_url,
    light_logo_url,
    dark_logo_url,
    favicon_url,
    primary_color,
    secondary_color,
    accent_color,
    currency,
    currency_symbol,
    email,
    phone,
    address,
    social_links,
    business_name,
    business_registration_number,
    tax_rate,
    tax_inclusive,
    tax_label,
    require_phone,
    allow_order_notes,
    meta_info,
    topbar_message,
    home_tagline_label,
  } = validatedFields.data;

  try {
    await createSiteConfigInDB({
      name,
      tagline: tagline || null,
      description: description || null,
      site_url: site_url || null,
      topbar_message: topbar_message || null,
      home_tagline_label: home_tagline_label || null,
      light_logo_url: light_logo_url || null,
      dark_logo_url: dark_logo_url || null,
      favicon_url: favicon_url || null,
      primary_color,
      secondary_color,
      accent_color,
      currency,
      currency_symbol,
      email: email || null,
      phone: phone || null,
      address: address || null,
      social_links,
      business_name: business_name || null,
      business_registration_number: business_registration_number || null,
      tax_rate: tax_rate ?? null,
      tax_inclusive,
      tax_label,
      require_phone,
      allow_order_notes,
      meta_info,
      created_by: Number(user.id),
      updated_by: Number(user.id),
    });
    revalidateTag("site-config", "max");
    revalidateTag("checkout", "max");
    revalidatePath("/dashboard/settings");
    return { success: true, message: "Site config created successfully." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Failed to create site config." };
  }
}

export async function updateSiteConfig(
  id: number,
  data: SiteConfigUpdateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/settings");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  const validatedFields = siteConfigUpdateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const {
    name,
    tagline,
    description,
    site_url,
    light_logo_url,
    dark_logo_url,
    favicon_url,
    primary_color,
    secondary_color,
    accent_color,
    currency,
    currency_symbol,
    email,
    phone,
    address,
    social_links,
    business_name,
    business_registration_number,
    tax_rate,
    tax_inclusive,
    tax_label,
    require_phone,
    allow_order_notes,
    meta_info,
    topbar_message,
    home_tagline_label,
  } = validatedFields.data;

  try {
    const existing = await getSiteConfigForRevalidationInDB(id);

    await updateSiteConfigInDB(id, {
      name,
      tagline: tagline !== undefined ? tagline || null : undefined,
      description: description !== undefined ? description || null : undefined,
      site_url: site_url !== undefined ? site_url || null : undefined,
      topbar_message:
        topbar_message !== undefined ? topbar_message || null : undefined,
      home_tagline_label:
        home_tagline_label !== undefined
          ? home_tagline_label || null
          : undefined,
      light_logo_url:
        light_logo_url !== undefined ? light_logo_url || null : undefined,
      dark_logo_url:
        dark_logo_url !== undefined ? dark_logo_url || null : undefined,
      favicon_url: favicon_url !== undefined ? favicon_url || null : undefined,
      primary_color,
      secondary_color,
      accent_color,
      currency,
      currency_symbol,
      email: email !== undefined ? email || null : undefined,
      phone: phone !== undefined ? phone || null : undefined,
      address: address !== undefined ? address || null : undefined,
      social_links,
      business_name,
      business_registration_number,
      tax_rate: tax_rate !== undefined ? (tax_rate ?? null) : undefined,
      tax_inclusive,
      tax_label,
      require_phone,
      allow_order_notes,
      meta_info,
      updated_by: Number(user.id),
    });

    revalidateTag("site-config", "max");

    // Revalidate site-header if header-related fields changed
    const headerChanged =
      name !== undefined ||
      light_logo_url !== undefined ||
      dark_logo_url !== undefined ||
      topbar_message !== undefined;
    if (headerChanged) revalidateTag("site-header", "max");

    // Revalidate site-footer if footer-related fields changed
    const footerChanged =
      name !== undefined ||
      description !== undefined ||
      email !== undefined ||
      phone !== undefined ||
      address !== undefined ||
      social_links !== undefined;
    if (footerChanged) revalidateTag("site-footer", "max");

    // Revalidate hero-banner if hero-related fields changed
    const heroChanged =
      home_tagline_label !== undefined ||
      tagline !== undefined ||
      description !== undefined ||
      accent_color !== undefined ||
      primary_color !== undefined;
    if (heroChanged) revalidateTag("hero-banner", "max");

    // Revalidate checkout if checkout-related fields changed
    const checkoutChanged =
      currency !== undefined ||
      currency_symbol !== undefined ||
      require_phone !== undefined ||
      allow_order_notes !== undefined ||
      tax_rate !== undefined ||
      tax_inclusive !== undefined ||
      tax_label !== undefined;
    if (checkoutChanged) revalidateTag("checkout", "max");

    // Revalidate layout if global design token fields changed
    const layoutChanged =
      primary_color !== undefined ||
      secondary_color !== undefined ||
      accent_color !== undefined;
    if (layoutChanged) revalidateTag("layout", "max");

    revalidatePath("/dashboard/settings");
    return { success: true, message: "Site config updated successfully." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Failed to update site config." };
  }
}

// ─── SITE PAGES ───────────────────────────────────────────────────────────────

export async function createSitePage(
  data: SitePageCreateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("create", "/dashboard/pages");

  const validatedFields = sitePageCreateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const { slug, title, content, is_active, meta_info } = validatedFields.data;

  try {
    await createSitePageInDB({
      slug,
      title,
      content,
      is_active,
      meta_info,
      created_by: Number(user.id),
      updated_by: Number(user.id),
    });
    revalidateTag("site-pages", "max");
    revalidatePath("/dashboard/pages");
    return { success: true, message: "Page created successfully." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Failed to create page." };
  }
}

export async function updateSitePage(
  id: number,
  data: SitePageUpdateInput,
): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/pages");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  const validatedFields = sitePageUpdateSchema.safeParse(data);
  if (!validatedFields.success) {
    return {
      success: false,
      errors: formatZodErrors(validatedFields.error),
      message: "Invalid Fields",
    };
  }

  const { slug, title, content, is_active, meta_info } = validatedFields.data;

  try {
    const result = await updateSitePageInDB(id, {
      slug,
      title,
      content,
      is_active,
      meta_info,
      updated_by: Number(user.id),
    });
    revalidateTag("site-pages", "max");
    revalidateTag(`site-page-${result.slug}`, "max");
    revalidatePath("/dashboard/pages");
    return { success: true, message: "Page updated successfully." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Failed to update page." };
  }
}

export async function deleteSitePage(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/pages");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    const result = await updateSitePageInDB(id, {
      updated_by: Number(user.id),
      deleted_at: new Date(),
      deleted_by: Number(user.id),
    });
    revalidateTag("site-pages", "max");
    revalidateTag(`site-page-${result.slug}`, "max");
    revalidatePath("/dashboard/pages");
    revalidatePath("/dashboard/pages/trash");
    return { success: true, message: "Page deleted successfully." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Failed to delete page." };
  }
}

export async function restoreSitePage(id: number): Promise<ActionResponse> {
  const { user } = await assertPermission("delete", "/dashboard/pages");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    const result = await updateSitePageInDB(id, {
      updated_by: Number(user.id),
      deleted_at: null,
      deleted_by: null,
    });
    revalidateTag("site-pages", "max");
    revalidateTag(`site-page-${result.slug}`, "max");
    revalidatePath("/dashboard/pages/trash");
    revalidatePath("/dashboard/pages");
    return { success: true, message: "Page restored successfully." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Failed to restore page." };
  }
}

export async function permanentlyDeleteSitePage(
  id: number,
): Promise<ActionResponse> {
  await assertPermission("delete", "/dashboard/pages");

  if (id < 1) return { success: false, message: "An Error Occurred" };

  try {
    const result = await deleteSitePagePermanentlyInDB(id);
    revalidateTag("site-pages", "max");
    revalidateTag(`site-page-${result.slug}`, "max");
    revalidatePath("/dashboard/pages/trash");
    return { success: true, message: "Page permanently deleted." };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Failed to permanently delete page." };
  }
}

// ─── SITEMAP GENERATION ───────────────────────────────────────────────────────

export async function generateSitemapAction(): Promise<ActionResponse> {
  const { user } = await assertPermission("update", "/dashboard/settings");

  try {
    const siteConfig = await prisma.site_config.findFirst({
      where: { deleted_at: null },
    });

    const rawBaseUrl =
      siteConfig?.site_url ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";
    const baseUrl = rawBaseUrl.replace(/\/$/, "");

    interface SitemapUrl {
      loc: string;
      lastmod: string;
      changefreq: string;
      priority: string;
    }

    const nowIso = new Date().toISOString();

    const urls: SitemapUrl[] = [
      {
        loc: baseUrl,
        lastmod: nowIso,
        changefreq: "daily",
        priority: "1.0",
      },
      {
        loc: `${baseUrl}/about`,
        lastmod: nowIso,
        changefreq: "monthly",
        priority: "0.5",
      },
      {
        loc: `${baseUrl}/contact`,
        lastmod: nowIso,
        changefreq: "monthly",
        priority: "0.5",
      },
      {
        loc: `${baseUrl}/search`,
        lastmod: nowIso,
        changefreq: "weekly",
        priority: "0.6",
      },
    ];

    // Categories
    const categories = await prisma.category.findMany({
      where: { deleted_at: null, is_active: true },
      select: { slug: true, updated_at: true },
    });
    for (const cat of categories) {
      urls.push({
        loc: `${baseUrl}/category/${cat.slug}`,
        lastmod: cat.updated_at.toISOString(),
        changefreq: "weekly",
        priority: "0.8",
      });
    }

    // Products
    const products = await prisma.product.findMany({
      where: { deleted_at: null, is_active: true },
      select: { slug: true, updated_at: true },
    });
    for (const prod of products) {
      urls.push({
        loc: `${baseUrl}/product/${prod.slug}`,
        lastmod: prod.updated_at.toISOString(),
        changefreq: "daily",
        priority: "0.9",
      });
    }

    // Site Pages
    const pages = await prisma.site_page.findMany({
      where: { deleted_at: null, is_active: true },
      select: { slug: true, updated_at: true },
    });
    for (const page of pages) {
      urls.push({
        loc: `${baseUrl}/pages/${page.slug}`,
        lastmod: page.updated_at.toISOString(),
        changefreq: "monthly",
        priority: "0.6",
      });
    }

    const xmlLines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map(
        (u) =>
          `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
      ),
      "</urlset>",
    ];

    const xmlContent = xmlLines.join("\n");
    const publicPath = path.join(process.cwd(), "public");
    await fs.mkdir(publicPath, { recursive: true });
    await fs.writeFile(
      path.join(publicPath, "sitemap.xml"),
      xmlContent,
      "utf-8",
    );

    // Update site config meta_info to record sitemap stats
    if (siteConfig) {
      const currentMetaInfo = (siteConfig.meta_info ?? {}) as Record<
        string,
        any
      >;
      const updatedMetaInfo = {
        ...currentMetaInfo,
        sitemap_last_generated: nowIso,
        sitemap_url_count: urls.length,
      };

      await updateSiteConfigInDB(siteConfig.id, {
        updated_by: Number(user.id),
        meta_info: updatedMetaInfo,
      });
    }

    revalidateTag("site-config", "max");
    revalidatePath("/sitemap.xml");
    revalidatePath("/dashboard/settings");

    return {
      success: true,
      message: `Sitemap successfully generated and saved with ${urls.length} URLs.`,
    };
  } catch (error) {
    console.error("Failed to generate sitemap:", error);
    return {
      success: false,
      message: "Failed to generate sitemap XML file.",
    };
  }
}
