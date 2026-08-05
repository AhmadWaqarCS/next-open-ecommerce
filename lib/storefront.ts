// lib/storefront.ts
// Clean, minimal storefront API layer.
// Exclusively exports types, getSiteConfig (cached), and 14 page/component data functions.

import { cacheLife, cacheTag } from "next/cache";
import prisma from "./prisma";

const CURRENCY_SYMBOL = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface StorefrontConfig {
  name: string;
  tagline: string | null;
  description: string | null;
  site_url: string | null;
  light_logo_url: string | null;
  dark_logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
  custom_css: string | null;
  header_config: Record<string, unknown>;
  footer_config: Record<string, unknown>;
  email: string | null;
  phone: string | null;
  address: string | null;
  social_links: Record<string, string | null>;
  currency: string;
  currency_symbol: string;
  meta_info: Record<string, string>;
  topbar_message: string | null;
  home_tagline_label: string | null;
  require_phone: boolean;
  allow_order_notes: boolean;
  tax_rate: number | null;
  tax_inclusive: boolean;
  tax_label: string;
}

export interface NavCategory {
  id: number;
  name: string;
  slug: string;
  children: { id: number; name: string; slug: string }[];
}

export interface FooterCategory {
  id: number;
  name: string;
  slug: string;
}

export interface HeaderData {
  siteName: string;
  lightLogoUrl: string | null;
  darkLogoUrl: string | null;
  topbarMessage: string | null;
  categories: NavCategory[];
  sitePages: { title: string; slug: string }[];
}

export interface StorefrontShippingMethod {
  id: number;
  name: string;
  description: string | null;
  price: number;
  free_over: number | null;
  estimated_days_min: number | null;
  estimated_days_max: number | null;
}

export interface StorefrontPaymentMethod {
  id: number;
  name: string;
  description: string | null;
  provider: string;
  extra_charge: number | null;
  instructions: string | null;
}

export interface FooterData {
  siteConfig: {
    name: string;
    description: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  categories: FooterCategory[];
  sitePages: { title: string; slug: string }[];
  shippingMethods: StorefrontShippingMethod[];
  paymentMethods: StorefrontPaymentMethod[];
  socialLinks: Record<string, string | null>;
}

export interface ShopCategory {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  bg_color: string | null;
  product_count: number;
}

export interface HeroBannerData {
  homeTaglineLabel: string | null;
  tagline: string | null;
  description: string | null;
  accentColor: string;
  primaryColor: string;
  categories: ShopCategory[];
}

export interface ProductCard {
  id: number;
  name: string;
  slug: string;
  feature_image_url: string | null;
  feature_image_alt_text: string | null;
  price: string;
  compare_at_price: string | null;
  category_name: string | null;
  is_featured: boolean;
}

export interface ProductFull {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  category_name: string | null;
  category_id: number | null;
  feature_image_url: string | null;
  feature_image_alt_text: string | null;
  price: string;
  compare_at_price: string | null;
  sku: string | null;
  stock_quantity: number;
  track_inventory: boolean;
  low_stock_threshold: number;
  is_featured: boolean;
  meta_info: Record<string, string>;
  images: { url: string; alt_text: string | null; sort_order: number }[];
  variants: {
    id: number;
    name: string;
    sku: string | null;
    price: string | null;
    compare_at_price: string | null;
    stock_quantity: number;
    options: unknown;
    image_url: string | null;
    is_active: boolean;
    sort_order: number;
  }[];
}

export interface CategoryPageData {
  category: {
    slug: string;
    name: string;
    description: string | null;
    image_url: string | null;
    bg_color: string | null;
    meta_info: Record<string, string>;
  } | null;
  products: ProductCard[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface SitePage {
  title: string;
  content: string | null;
  meta_info: Record<string, string>;
  theme_config: Record<string, unknown>;
  components_config: {
    component_key: string;
    enabled: boolean;
    sort_order: number;
    props?: Record<string, unknown>;
  }[];
}

export interface PublicOrder {
  order_number: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  shipping_address_line1: string;
  shipping_address_line2: string | null;
  shipping_city: string;
  shipping_state: string | null;
  shipping_postal_code: string;
  shipping_country: string;
  shipping_method_name: string;
  shipping_cost: string;
  subtotal: string;
  tax_amount: string;
  discount_amount: string;
  total: string;
  currency: string;
  payment_method: string;
  payment_method_name: string;
  payment_status: string;
  fulfillment_status: string;
  customer_notes: string | null;
  placed_at: Date;
  items: {
    product_name: string;
    variant_name: string | null;
    quantity: number;
    unit_price: string;
    line_total: string;
    image_url: string | null;
    options: unknown;
  }[];
}

export interface CheckoutConfig {
  currency: string;
  currency_symbol: string;
  require_phone: boolean;
  allow_order_notes: boolean;
  tax_rate: number | null;
  tax_inclusive: boolean;
  tax_label: string;
}

export interface CheckoutPageData {
  shippingMethods: StorefrontShippingMethod[];
  paymentMethods: StorefrontPaymentMethod[];
  checkoutConfig: CheckoutConfig | null;
}

// ─── Central Site Config Fetcher (Cached) ────────────────────────────────────

export async function getSiteConfig(): Promise<StorefrontConfig | null> {
  "use cache";
  cacheTag("site-config");
  cacheLife("max");

  const row = await prisma.site_config.findFirst({
    where: { deleted_at: null },
    select: {
      name: true,
      tagline: true,
      description: true,
      site_url: true,
      light_logo_url: true,
      dark_logo_url: true,
      favicon_url: true,
      primary_color: true,
      secondary_color: true,
      accent_color: true,
      font_family: true,
      custom_css: true,
      header_config: true,
      footer_config: true,
      email: true,
      phone: true,
      address: true,
      social_links: true,
      currency: true,
      currency_symbol: true,
      meta_info: true,
      topbar_message: true,
      home_tagline_label: true,
      require_phone: true,
      allow_order_notes: true,
      tax_rate: true,
      tax_inclusive: true,
      tax_label: true,
    },
  });

  if (!row) return null;
  return {
    ...row,
    header_config: (row.header_config ?? {}) as Record<string, unknown>,
    footer_config: (row.footer_config ?? {}) as Record<string, unknown>,
    social_links: (row.social_links ?? {}) as Record<string, string | null>,
    meta_info: (row.meta_info ?? {}) as Record<string, string>,
    tax_rate: row.tax_rate !== null ? Number(row.tax_rate) : null,
  };
}

// ─── 1. Header Data ───────────────────────────────────────────────────────────

export async function getHeaderData(): Promise<HeaderData> {
  const [config, navCategories, sitePages] = await Promise.all([
    getSiteConfig(),
    prisma.category.findMany({
      where: {
        is_active: true,
        show_in_header: true,
        parent_id: null,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        children: {
          where: { is_active: true, show_in_header: true, deleted_at: null },
          select: { id: true, name: true, slug: true },
          orderBy: { sort_order: "asc" },
        },
      },
      orderBy: { sort_order: "asc" },
    }),
    prisma.site_page.findMany({
      where: { is_active: true, show_in_header: true, deleted_at: null },
      select: { title: true, slug: true },
      orderBy: { sort_order: "asc" },
    }),
  ]);

  return {
    siteName: config?.name || "Store",
    lightLogoUrl: config?.light_logo_url || null,
    darkLogoUrl: config?.dark_logo_url || null,
    topbarMessage: config?.topbar_message || null,
    categories: navCategories || [],
    sitePages: sitePages || [],
  };
}

// ─── 2. Footer Data ───────────────────────────────────────────────────────────

export async function getFooterData(): Promise<FooterData> {
  const [config, categories, sitePages, shippingMethods, paymentMethods] =
    await Promise.all([
      getSiteConfig(),
      prisma.category.findMany({
        where: {
          is_active: true,
          show_in_footer: true,
          parent_id: null,
          deleted_at: null,
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
        orderBy: { sort_order: "asc" },
      }),
      prisma.site_page.findMany({
        where: { is_active: true, show_in_footer: true, deleted_at: null },
        select: { title: true, slug: true },
        orderBy: { sort_order: "asc" },
      }),
      prisma.shipping_method.findMany({
        where: { is_active: true, deleted_at: null },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          free_over: true,
          estimated_days_min: true,
          estimated_days_max: true,
        },
        orderBy: { sort_order: "asc" },
      }),
      prisma.payment_method.findMany({
        where: { is_active: true, deleted_at: null },
        select: {
          id: true,
          name: true,
          description: true,
          provider: true,
          extra_charge: true,
          instructions: true,
        },
        orderBy: { sort_order: "asc" },
      }),
    ]);

  return {
    siteConfig: {
      name: config?.name || "Store",
      description: config?.description || null,
      email: config?.email || null,
      phone: config?.phone || null,
      address: config?.address || null,
    },
    categories: categories || [],
    sitePages: sitePages || [],
    shippingMethods: (shippingMethods || []).map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      price: Number(m.price),
      free_over: m.free_over !== null ? Number(m.free_over) : null,
      estimated_days_min: m.estimated_days_min,
      estimated_days_max: m.estimated_days_max,
    })),
    paymentMethods: (paymentMethods || []).map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      provider: m.provider,
      extra_charge: m.extra_charge !== null ? Number(m.extra_charge) : null,
      instructions: m.instructions,
    })),
    socialLinks: (config?.social_links ?? {}) as Record<string, string | null>,
  };
}

// ─── 4. Home Page Data ────────────────────────────────────────────────────────

export async function getHomePageData(): Promise<{}> {
  return {};
}

// ─── 5. Featured Products ─────────────────────────────────────────────────────

export async function getFeaturedProducts(
  limit = 4,
): Promise<{ products: ProductCard[] }> {
  const rows = await prisma.product.findMany({
    where: { is_active: true, is_featured: true, deleted_at: null },
    select: {
      id: true,
      name: true,
      slug: true,
      feature_image_url: true,
      feature_image_alt_text: true,
      price: true,
      compare_at_price: true,
      category_name: true,
      is_featured: true,
    },
    orderBy: { sort_order: "asc" },
    take: limit,
  });

  return {
    products: rows.map((r) => ({
      ...r,
      price: String(r.price),
      compare_at_price:
        r.compare_at_price !== null ? String(r.compare_at_price) : null,
    })),
  };
}

// ─── 6. Category Page Data ────────────────────────────────────────────────────

const CATEGORY_PAGE_SIZE = 24;

export async function getCategoryPageData(
  slug: string,
  page = 1,
): Promise<CategoryPageData> {
  const categoryRow = await prisma.category.findUnique({
    where: { slug, is_active: true, deleted_at: null },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      image_url: true,
      bg_color: true,
      meta_info: true,
      children: {
        where: { is_active: true, deleted_at: null },
        select: { id: true },
      },
    },
  });

  if (!categoryRow) {
    return {
      category: null,
      products: [],
      total: 0,
      page,
      pageSize: CATEGORY_PAGE_SIZE,
      pageCount: 0,
    };
  }

  const categoryIds = [
    categoryRow.id,
    ...categoryRow.children.map((child) => child.id),
  ];

  const skip = (page - 1) * CATEGORY_PAGE_SIZE;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: {
        is_active: true,
        deleted_at: null,
        category_id: { in: categoryIds },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        feature_image_url: true,
        feature_image_alt_text: true,
        price: true,
        compare_at_price: true,
        category_name: true,
        is_featured: true,
      },
      orderBy: { sort_order: "asc" },
      skip,
      take: CATEGORY_PAGE_SIZE,
    }),
    prisma.product.count({
      where: {
        is_active: true,
        deleted_at: null,
        category_id: { in: categoryIds },
      },
    }),
  ]);

  return {
    category: {
      slug: categoryRow.slug,
      name: categoryRow.name,
      description: categoryRow.description,
      image_url: categoryRow.image_url,
      bg_color: categoryRow.bg_color,
      meta_info: (categoryRow.meta_info ?? {}) as Record<string, string>,
    },
    products: products.map((r) => ({
      ...r,
      price: String(r.price),
      compare_at_price:
        r.compare_at_price !== null ? String(r.compare_at_price) : null,
    })),
    total,
    page,
    pageSize: CATEGORY_PAGE_SIZE,
    pageCount: Math.ceil(total / CATEGORY_PAGE_SIZE),
  };
}

// ─── 7. Category Slugs ────────────────────────────────────────────────────────

export async function getCategorySlugs(limit = 1): Promise<string[]> {
  const rows = await prisma.category.findMany({
    where: { is_active: true, deleted_at: null },
    select: { slug: true },
    take: limit,
  });
  return rows.map((r) => r.slug);
}

// ─── 8. Product Page Data ─────────────────────────────────────────────────────

export async function getProductPageData(
  slug: string,
): Promise<{ product: ProductFull | null }> {
  const row = await prisma.product.findUnique({
    where: { slug, is_active: true, deleted_at: null },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      short_description: true,
      category_name: true,
      category_id: true,
      feature_image_url: true,
      feature_image_alt_text: true,
      price: true,
      compare_at_price: true,
      sku: true,
      stock_quantity: true,
      track_inventory: true,
      low_stock_threshold: true,
      is_featured: true,
      meta_info: true,
      images: {
        where: { deleted_at: null },
        select: { url: true, alt_text: true, sort_order: true },
        orderBy: { sort_order: "asc" },
      },
      variants: {
        where: { is_active: true, deleted_at: null },
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          compare_at_price: true,
          stock_quantity: true,
          options: true,
          image_url: true,
          is_active: true,
          sort_order: true,
        },
        orderBy: { sort_order: "asc" },
      },
    },
  });

  if (!row) return { product: null };

  return {
    product: {
      ...row,
      price: String(row.price),
      compare_at_price:
        row.compare_at_price !== null ? String(row.compare_at_price) : null,
      meta_info: (row.meta_info ?? {}) as Record<string, string>,
      variants: row.variants.map((v) => ({
        ...v,
        price: v.price !== null ? String(v.price) : null,
        compare_at_price:
          v.compare_at_price !== null ? String(v.compare_at_price) : null,
      })),
    },
  };
}

// ─── 9. Product Page Slugs ────────────────────────────────────────────────────

export async function getProductPageSlugs(limit = 1): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: { is_active: true, deleted_at: null },
    select: { slug: true },
    take: limit,
  });
  return rows.map((r) => r.slug);
}

// ─── 10. Search Page Products ─────────────────────────────────────────────────

export async function getSearchPageProducts(
  query: string,
  page = 1,
  pageSize = 24,
): Promise<{ products: ProductCard[]; total: number; pageCount: number }> {
  const sanitized = query.trim().slice(0, 100);
  if (!sanitized) return { products: [], total: 0, pageCount: 0 };

  const where = {
    is_active: true,
    deleted_at: null,
    OR: [
      { name: { contains: sanitized, mode: "insensitive" as const } },
      {
        short_description: {
          contains: sanitized,
          mode: "insensitive" as const,
        },
      },
      { category_name: { contains: sanitized, mode: "insensitive" as const } },
    ],
  };

  const skip = (page - 1) * pageSize;

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        feature_image_url: true,
        feature_image_alt_text: true,
        price: true,
        compare_at_price: true,
        category_name: true,
        is_featured: true,
      },
      orderBy: { sort_order: "asc" },
      skip,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products: rows.map((r) => ({
      ...r,
      price: String(r.price),
      compare_at_price:
        r.compare_at_price !== null ? String(r.compare_at_price) : null,
    })),
    total,
    pageCount: Math.ceil(total / pageSize),
  };
}

// ─── 11. Page Data ────────────────────────────────────────────────────────────

export async function getPageData(
  slug: string,
): Promise<{ page: SitePage | null }> {
  const row = await prisma.site_page.findUnique({
    where: { slug, is_active: true, deleted_at: null },
    select: {
      title: true,
      content: true,
      meta_info: true,
      theme_config: true,
      components_config: true,
    },
  });

  if (!row) return { page: null };

  return {
    page: {
      ...row,
      meta_info: (row.meta_info ?? {}) as Record<string, string>,
      theme_config: (row.theme_config ?? {}) as Record<string, unknown>,
      components_config: (Array.isArray(row.components_config)
        ? row.components_config
        : []) as {
        component_key: string;
        enabled: boolean;
        sort_order: number;
        props?: Record<string, unknown>;
      }[],
    },
  };
}

// ─── 12. Hero Banner Data ─────────────────────────────────────────────────────

export async function getHeroBannerData(): Promise<HeroBannerData> {
  const [config, categoryRows] = await Promise.all([
    getSiteConfig(),
    prisma.category.findMany({
      where: { is_active: true, show_in_home: true, deleted_at: null },
      select: {
        id: true,
        name: true,
        slug: true,
        image_url: true,
        bg_color: true,
        product_count: true,
        _count: {
          select: {
            products: {
              where: { is_active: true, deleted_at: null },
            },
          },
        },
      },
      orderBy: { sort_order: "asc" },
    }),
  ]);

  return {
    homeTaglineLabel: config?.home_tagline_label || null,
    tagline: config?.tagline || "Wear what you love.",
    description: config?.description || "Curated fashion for every occasion.",
    accentColor: config?.accent_color || "#e8c98e",
    primaryColor: config?.primary_color || "#0f0f0f",
    categories: categoryRows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      image_url: r.image_url,
      bg_color: r.bg_color,
      product_count: r._count.products,
    })),
  };
}

// ─── 12b. All Categories Page Data ───────────────────────────────────────────

export async function getAllCategoriesPageData(): Promise<{
  categories: ShopCategory[];
}> {
  const categoryRows = await prisma.category.findMany({
    where: { is_active: true, deleted_at: null },
    select: {
      id: true,
      name: true,
      slug: true,
      image_url: true,
      bg_color: true,
      product_count: true,
      _count: {
        select: {
          products: {
            where: { is_active: true, deleted_at: null },
          },
        },
      },
    },
    orderBy: { sort_order: "asc" },
  });

  return {
    categories: categoryRows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      image_url: r.image_url,
      bg_color: r.bg_color,
      product_count: r._count.products,
    })),
  };
}

// ─── 13. Order Confirmation Page Data ────────────────────────────────────────

export async function getOrderConfirmationPageData(
  orderNumber: string,
): Promise<{ order: PublicOrder | null }> {
  const row = await prisma.order.findUnique({
    where: { order_number: orderNumber, deleted_at: null },
    select: {
      order_number: true,
      customer_first_name: true,
      customer_last_name: true,
      customer_email: true,
      shipping_address_line1: true,
      shipping_address_line2: true,
      shipping_city: true,
      shipping_state: true,
      shipping_postal_code: true,
      shipping_country: true,
      shipping_method_name: true,
      shipping_cost: true,
      subtotal: true,
      tax_amount: true,
      discount_amount: true,
      total: true,
      currency: true,
      payment_method: true,
      payment_method_name: true,
      payment_status: true,
      fulfillment_status: true,
      customer_notes: true,
      placed_at: true,
      items: {
        select: {
          product_name: true,
          variant_name: true,
          quantity: true,
          unit_price: true,
          line_total: true,
          image_url: true,
          options: true,
        },
      },
    },
  });

  if (!row) return { order: null };

  return {
    order: {
      ...row,
      shipping_cost: String(row.shipping_cost),
      subtotal: String(row.subtotal),
      tax_amount: String(row.tax_amount),
      discount_amount: String(row.discount_amount),
      total: String(row.total),
      items: row.items.map((i) => ({
        ...i,
        unit_price: String(i.unit_price),
        line_total: String(i.line_total),
      })),
    },
  };
}

// ─── 14. Checkout Page Data ───────────────────────────────────────────────────

export async function getCheckoutPageData(): Promise<CheckoutPageData> {
  const [shippingMethods, paymentMethods, config] = await Promise.all([
    prisma.shipping_method.findMany({
      where: { is_active: true, deleted_at: null },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        free_over: true,
        estimated_days_min: true,
        estimated_days_max: true,
      },
      orderBy: { sort_order: "asc" },
    }),
    prisma.payment_method.findMany({
      where: { is_active: true, deleted_at: null },
      select: {
        id: true,
        name: true,
        description: true,
        provider: true,
        extra_charge: true,
        instructions: true,
      },
      orderBy: { sort_order: "asc" },
    }),
    getSiteConfig(),
  ]);

  return {
    shippingMethods: (shippingMethods || []).map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      price: Number(m.price),
      free_over: m.free_over !== null ? Number(m.free_over) : null,
      estimated_days_min: m.estimated_days_min,
      estimated_days_max: m.estimated_days_max,
    })),
    paymentMethods: (paymentMethods || []).map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      provider: m.provider,
      extra_charge: m.extra_charge !== null ? Number(m.extra_charge) : null,
      instructions: m.instructions,
    })),
    checkoutConfig: config
      ? {
          currency: config.currency,
          currency_symbol: config.currency_symbol,
          require_phone: config.require_phone,
          allow_order_notes: config.allow_order_notes,
          tax_rate: config.tax_rate,
          tax_inclusive: config.tax_inclusive,
          tax_label: config.tax_label,
        }
      : null,
  };
}
