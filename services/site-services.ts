import prisma from "@/lib/prisma";
import { saveMediaToStorage, deleteMediaFromStorage } from "@/services/storage-services";

async function processLogoOrFavicon(urlOrPayload?: string | null): Promise<string | null> {
  if (!urlOrPayload) return null;
  const res = await saveMediaToStorage(urlOrPayload, undefined, "branding");
  return res ? res.relativePath : urlOrPayload;
}

export async function createSiteConfigTransaction(
  data: {
    name: string;
    tagline?: string | null;
    description?: string | null;
    site_url?: string | null;
    topbar_message?: string | null;
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
    captcha_provider?: string;
    meta_info?: object;
  },
  userId: number,
) {
  const lightLogo = data.light_logo_url ? await processLogoOrFavicon(data.light_logo_url) : null;
  const darkLogo = data.dark_logo_url ? await processLogoOrFavicon(data.dark_logo_url) : null;
  const favicon = data.favicon_url ? await processLogoOrFavicon(data.favicon_url) : null;

  return await prisma.$transaction(async (tx) => {
    const config = await tx.site_config.create({
      data: {
        ...data,
        light_logo_url: lightLogo,
        dark_logo_url: darkLogo,
        favicon_url: favicon,
        created_by: userId,
        updated_by: userId,
      },
    });
    return { config };
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
    captcha_provider?: string;
    meta_info?: object;
  },
  userId: number,
) {
  const processedLightLogo = data.light_logo_url !== undefined
    ? (data.light_logo_url ? await processLogoOrFavicon(data.light_logo_url) : null)
    : undefined;
  const processedDarkLogo = data.dark_logo_url !== undefined
    ? (data.dark_logo_url ? await processLogoOrFavicon(data.dark_logo_url) : null)
    : undefined;
  const processedFavicon = data.favicon_url !== undefined
    ? (data.favicon_url ? await processLogoOrFavicon(data.favicon_url) : null)
    : undefined;

  const removedMediaUrls: string[] = [];

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.site_config.findUnique({ where: { id } });
    if (!existing) throw new Error("Site config not found.");

    const updatePayload: Record<string, any> = {};

    const keysToCheck = [
      "name", "tagline", "description", "site_url", "topbar_message",
      "primary_color", "secondary_color", "accent_color", "font_family", "custom_css",
      "currency", "currency_symbol", "email", "phone", "address",
      "business_name", "business_registration_number", "tax_rate", "tax_inclusive",
      "tax_label", "require_phone", "allow_order_notes", "captcha_provider"
    ];

    for (const k of keysToCheck) {
      if ((data as any)[k] !== undefined && (data as any)[k] !== (existing as any)[k]) {
        updatePayload[k] = (data as any)[k];
      }
    }

    if (data.header_config !== undefined && JSON.stringify(data.header_config) !== JSON.stringify(existing.header_config)) {
      updatePayload.header_config = data.header_config;
    }
    if (data.footer_config !== undefined && JSON.stringify(data.footer_config) !== JSON.stringify(existing.footer_config)) {
      updatePayload.footer_config = data.footer_config;
    }
    if (data.social_links !== undefined && JSON.stringify(data.social_links) !== JSON.stringify(existing.social_links)) {
      updatePayload.social_links = data.social_links;
    }
    if (data.meta_info !== undefined && JSON.stringify(data.meta_info) !== JSON.stringify(existing.meta_info)) {
      updatePayload.meta_info = data.meta_info;
    }

    if (processedLightLogo !== undefined && processedLightLogo !== existing.light_logo_url) {
      updatePayload.light_logo_url = processedLightLogo;
      if (existing.light_logo_url) removedMediaUrls.push(existing.light_logo_url);
    }
    if (processedDarkLogo !== undefined && processedDarkLogo !== existing.dark_logo_url) {
      updatePayload.dark_logo_url = processedDarkLogo;
      if (existing.dark_logo_url) removedMediaUrls.push(existing.dark_logo_url);
    }
    if (processedFavicon !== undefined && processedFavicon !== existing.favicon_url) {
      updatePayload.favicon_url = processedFavicon;
      if (existing.favicon_url) removedMediaUrls.push(existing.favicon_url);
    }

    let updated = existing as any;
    if (Object.keys(updatePayload).length > 0) {
      updatePayload.updated_by = userId;
      updated = await tx.site_config.update({
        where: { id },
        data: updatePayload,
      });
    }

    return { existing, updated };
  });

  // Delete old media files AFTER DB commit — fire-and-forget
  for (const url of removedMediaUrls) {
    deleteMediaFromStorage(url).catch((err) =>
      console.warn(`[Site Config] Failed to delete old media '${url}':`, err)
    );
  }

  return result;
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
      where: { is_active: true },
      select: { slug: true, updated_at: true },
    });

    return { siteConfig, categories, products, pages };
  });
}

export async function getSiteConfigDashboardDataInDB() {
  return await prisma.site_config.findFirst({
    where: { deleted_at: null },
    select: {
      id: true,
      name: true,
      tagline: true,
      description: true,
      site_url: true,
      topbar_message: true,
      light_logo_url: true,
      dark_logo_url: true,
      favicon_url: true,
      primary_color: true,
      secondary_color: true,
      accent_color: true,
      currency: true,
      currency_symbol: true,
      email: true,
      phone: true,
      address: true,
      social_links: true,
      business_name: true,
      business_registration_number: true,
      tax_rate: true,
      tax_inclusive: true,
      tax_label: true,
      require_phone: true,
      allow_order_notes: true,
      captcha_provider: true,
      meta_info: true,
    },
  });
}

