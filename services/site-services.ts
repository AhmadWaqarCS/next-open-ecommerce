import prisma from "@/lib/prisma";

export async function getSiteConfigAdminFromDB() {
  return await prisma.site_config.findFirst({ where: { deleted_at: null } });
}

export async function createSiteConfigInDB(data: {
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
  created_by: number;
  updated_by: number;
}) {
  return await prisma.site_config.create({ data });
}

export async function updateSiteConfigInDB(
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
    updated_by: number;
    deleted_at?: Date | null;
    deleted_by?: number | null;
  },
) {
  return await prisma.site_config.update({ where: { id }, data });
}

export async function getSitePagesFromDB() {
  return await prisma.site_page.findMany({
    where: { is_active: true, deleted_at: null },
    select: { id: true, slug: true, title: true },
    orderBy: { title: "asc" },
  });
}

export async function getSitePageBySlugFromDB(slug: string) {
  return await prisma.site_page.findUnique({
    where: { slug, is_active: true, deleted_at: null },
  });
}

export async function getSitePagesAdminFromDB() {
  return await prisma.site_page.findMany({
    where: { deleted_at: null },
    orderBy: { title: "asc" },
  });
}

export async function getDeletedSitePagesFromDB() {
  return await prisma.site_page.findMany({
    where: { deleted_at: { not: null } },
    select: {
      id: true,
      slug: true,
      title: true,
      deleted_at: true,
      deleted_by: true,
    },
    orderBy: { deleted_at: "desc" },
  });
}

export async function createSitePageInDB(data: {
  slug: string;
  title: string;
  content: string;
  is_active?: boolean;
  meta_info?: object;
  created_by: number;
  updated_by: number;
}) {
  return await prisma.site_page.create({ data });
}

export async function updateSitePageInDB(
  id: number,
  data: {
    slug?: string;
    title?: string;
    content?: string;
    is_active?: boolean;
    meta_info?: object;
    updated_by: number;
    deleted_at?: Date | null;
    deleted_by?: number | null;
  },
) {
  return await prisma.site_page.update({ where: { id }, data });
}

export async function deleteSitePagePermanentlyInDB(id: number) {
  return await prisma.site_page.delete({ where: { id } });
}
