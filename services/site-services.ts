import prisma from "@/lib/prisma";

export async function createSiteConfigTransaction(
  data: {
    name: string;
    tagline?: string | null;
    description?: string | null;
    site_url?: string | null;
    topbar_message?: string | null;
    home_tagline_label?: string | null;
    light_logo_url?: string | null;
    dark_logo_url?: string | null;
    favicon_url?: string | null;
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    font_family?: string;
    custom_css?: string | null;
    header_config?: object;
    footer_config?: object;
    currency?: string;
    currency_symbol?: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    social_links?: object;
    business_name?: string | null;
    business_registration_number?: string | null;
    tax_rate?: number | null;
    tax_inclusive?: boolean;
    tax_label?: string;
    require_phone?: boolean;
    allow_order_notes?: boolean;
    meta_info?: object;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const config = await tx.site_config.create({
      data: {
        ...data,
        created_by: userId,
        updated_by: userId,
      },
    });
    return config;
  });
}

export async function updateSiteConfigTransaction(
  id: number,
  data: {
    name?: string;
    tagline?: string | null;
    description?: string | null;
    site_url?: string | null;
    topbar_message?: string | null;
    home_tagline_label?: string | null;
    light_logo_url?: string | null;
    dark_logo_url?: string | null;
    favicon_url?: string | null;
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    font_family?: string;
    custom_css?: string | null;
    header_config?: object;
    footer_config?: object;
    currency?: string;
    currency_symbol?: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    social_links?: object;
    business_name?: string | null;
    business_registration_number?: string | null;
    tax_rate?: number | null;
    tax_inclusive?: boolean;
    tax_label?: string;
    require_phone?: boolean;
    allow_order_notes?: boolean;
    meta_info?: object;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.site_config.findUnique({ where: { id } });
    if (!existing) throw new Error("Site config not found.");

    const removedMediaUrls: string[] = [];

    if (
      data.light_logo_url !== undefined &&
      data.light_logo_url !== existing.light_logo_url &&
      existing.light_logo_url
    ) {
      removedMediaUrls.push(existing.light_logo_url);
    }
    if (
      data.dark_logo_url !== undefined &&
      data.dark_logo_url !== existing.dark_logo_url &&
      existing.dark_logo_url
    ) {
      removedMediaUrls.push(existing.dark_logo_url);
    }
    if (
      data.favicon_url !== undefined &&
      data.favicon_url !== existing.favicon_url &&
      existing.favicon_url
    ) {
      removedMediaUrls.push(existing.favicon_url);
    }

    const updated = await tx.site_config.update({
      where: { id },
      data: {
        ...data,
        updated_by: userId,
      },
    });

    return {
      existing,
      updated,
      removedMediaUrls: Array.from(new Set(removedMediaUrls.filter(Boolean))),
    };
  });
}

export async function getSitemapDataTransaction() {
  return await prisma.$transaction(async (tx) => {
    const siteConfig = await tx.site_config.findFirst({
      where: { deleted_at: null },
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
      where: { deleted_at: null, is_active: true },
      select: { slug: true, updated_at: true },
    });

    return { siteConfig, categories, products, pages };
  });
}
