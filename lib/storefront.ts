// lib/storefront.ts
// Clean, minimal storefront API layer.
// Exclusively exports types, getSiteConfig (cached), and 14 page/component data functions.

import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import prisma from "./prisma";
import { isStripeConfigured } from "./stripe";

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
  font_family: string;
  custom_css: string | null;
  theme_config: Record<string, unknown>;
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
  require_phone: boolean;
  allow_order_notes: boolean;
  tax_rate: number | null;
  tax_inclusive: boolean;
  tax_label: string;
  captcha_provider: string;
  turnstile_site_key: string | null;
  recaptcha_site_key: string | null;
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
  headerConfig?: Record<string, unknown>;
  themeConfig?: Record<string, unknown>;
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
    captchaProvider?: string;
    turnstileSiteKey?: string | null;
    recaptchaSiteKey?: string | null;
  };
  footerConfig?: Record<string, unknown>;
  themeConfig?: Record<string, unknown>;
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
  tagline: string | null;
  description: string | null;
  accentColor: string;
  primaryColor: string;
  categories: ShopCategory[];
}

// ─── Home Page Component Config Types ────────────────────────────────────────

export type HeroType = "hero-banner" | "hero-carousel";

export interface ComponentClassOverrides {
  [slotKey: string]: string;
}

export interface HeroBannerProps {
  tagline?: string;
  description?: string;
  accentColor?: string;
  primaryColor?: string;
  ctaCategory1Slug?: string;
  ctaCategory2Slug?: string;
  classOverrides?: ComponentClassOverrides;
}

export interface HeroCarouselProps {
  autoPlayInterval?: number;
  classOverrides?: ComponentClassOverrides;
}

export interface CategoryCarouselConfig {
  limit?: number;
  autoScrollInterval?: number;
  classOverrides?: ComponentClassOverrides;
}

export interface PageComponentConfig {
  component_key: string;
  enabled: boolean;
  sort_order: number;
  props?: Record<string, unknown>;
}

export interface FeaturedProductsConfig {
  limit?: number;
  classOverrides?: ComponentClassOverrides;
}

export interface HomePageData {
  pageTitle: string;
  meta_info: Record<string, string>;
  themeConfig: Record<string, unknown>;
  custom_css?: string | null;
  customThemeComponent?: {
    theme_name?: string;
    component_path?: string;
    theme_config?: Record<string, unknown>;
  } | null;
  heroType: HeroType;
  heroBannerProps: HeroBannerProps;
  heroCarouselProps: HeroCarouselProps;
  categoryCarouselConfig: CategoryCarouselConfig;
  featuredProductsConfig: FeaturedProductsConfig;
  homeCategories: ShopCategory[];
  categoryCarousels: CategoryCarouselItem[];
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
  custom_css?: string | null;
  meta_info: Record<string, string>;
  theme_config: Record<string, unknown>;
}

export interface PublicOrder {
  id: number;
  order_number: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string | null;
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
  tracking_number: string | null;
  tracking_url: string | null;
  carrier_name: string | null;
  shipped_at: Date | null;
  delivered_at: Date | null;
  cancelled_at: Date | null;
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
  invoice: {
    invoice_number: string;
    status: string;
    issued_at: Date;
    paid_at: Date | null;
    subtotal: string;
    tax_amount: string;
    shipping_cost: string;
    discount_amount: string;
    total: string;
    currency: string;
    notes: string | null;
  } | null;
}

export interface CheckoutConfig {
  currency: string;
  currency_symbol: string;
  require_phone: boolean;
  allow_order_notes: boolean;
  tax_rate: number | null;
  tax_inclusive: boolean;
  tax_label: string;
  captcha_provider: string;
  turnstile_site_key: string | null;
  recaptcha_site_key: string | null;
}

export interface CheckoutPageData {
  shippingMethods: StorefrontShippingMethod[];
  paymentMethods: StorefrontPaymentMethod[];
  checkoutConfig: CheckoutConfig | null;
}

// ─── Central Site Config Fetcher (Cached) ────────────────────────────────────

export const getSiteConfig = cache(
  async function getSiteConfig(): Promise<StorefrontConfig | null> {
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
        font_family: true,
        custom_css: true,
        theme_config: true,
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
        require_phone: true,
        allow_order_notes: true,
        tax_rate: true,
        tax_inclusive: true,
        tax_label: true,
        captcha_provider: true,
      },
    });

    if (!row) return null;
    return {
      ...row,
      theme_config: (row.theme_config ?? {}) as Record<string, unknown>,
      header_config: (row.header_config ?? {}) as Record<string, unknown>,
      footer_config: (row.footer_config ?? {}) as Record<string, unknown>,
      social_links: (row.social_links ?? {}) as Record<string, string | null>,
      meta_info: (row.meta_info ?? {}) as Record<string, string>,
      tax_rate: row.tax_rate !== null ? Number(row.tax_rate) : null,
      captcha_provider: row.captcha_provider ?? "none",
      turnstile_site_key: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null,
      recaptcha_site_key: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || null,
    };
  },
);

// ─── 1. Header Data ───────────────────────────────────────────────────────────

export const getHeaderData = cache(
  async function getHeaderData(): Promise<HeaderData> {
    const config = await getSiteConfig();
    const [navCategories, sitePages] = await prisma.$transaction([
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
        where: { is_active: true, show_in_header: true },
        select: { title: true, slug: true },
        orderBy: { sort_order: "asc" },
      }),
    ]);

    return {
      siteName: config?.name || "Store",
      lightLogoUrl: config?.light_logo_url || null,
      darkLogoUrl: config?.dark_logo_url || null,
      topbarMessage: config?.topbar_message || null,
      headerConfig: config?.header_config || {},
      themeConfig: config?.theme_config || {},
      categories: navCategories || [],
      sitePages: sitePages || [],
    };
  },
);

// ─── 2. Footer Data ───────────────────────────────────────────────────────────

export const getFooterData = cache(
  async function getFooterData(): Promise<FooterData> {
    const config = await getSiteConfig();
    const [categories, sitePages, shippingMethods, paymentMethods] =
      await prisma.$transaction([
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
          where: { is_active: true, show_in_footer: true },
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
          where: { is_active: true },
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
        captchaProvider: config?.captcha_provider || "none",
        turnstileSiteKey: config?.turnstile_site_key || null,
        recaptchaSiteKey: config?.recaptcha_site_key || null,
      },
      categories: categories || [],
      sitePages: sitePages || [],
      footerConfig: config?.footer_config || {},
      themeConfig: config?.theme_config || {},
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
      socialLinks: (config?.social_links ?? {}) as Record<
        string,
        string | null
      >,
    };
  },
);

// ─── 4. Home Page Data ────────────────────────────────────────────────────────

export const getHomePageData = cache(
  async function getHomePageData(): Promise<HomePageData> {
    "use cache";
    cacheTag("home-page");
    cacheLife("max");

    // ── Single transaction: site_page + site_config + home categories ──────────
    const [pageRow, configRow, categoryRows] = await prisma.$transaction([
      prisma.site_page.findUnique({
        where: { slug: "/", is_active: true },
        select: {
          title: true,
          meta_info: true,
          theme_config: true,
          custom_css: true,
        },
      }),
      prisma.site_config.findFirst({
        where: { deleted_at: null },
        select: {
          tagline: true,
          description: true,
          theme_config: true,
        },
      }),
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
              products: { where: { is_active: true, deleted_at: null } },
            },
          },
          children: {
            where: { is_active: true, deleted_at: null },
            select: {
              id: true,
              children: {
                where: { is_active: true, deleted_at: null },
                select: { id: true },
              },
            },
          },
        },
        orderBy: { sort_order: "asc" },
      }),
    ]);

    const pageThemeConfig = (pageRow?.theme_config ?? {}) as Record<string, any>;
    const customThemeComponent =
      pageThemeConfig.theme_name && pageThemeConfig.component_path
        ? {
            theme_name: pageThemeConfig.theme_name as string,
            component_path: pageThemeConfig.component_path as string,
            theme_config: (pageThemeConfig.theme_config ?? {}) as Record<string, unknown>,
          }
        : null;

    const heroType: HeroType = "hero-banner";
    const heroBannerProps: HeroBannerProps = {};
    const heroCarouselProps: HeroCarouselProps = {};
    const categoryCarouselConfig: CategoryCarouselConfig = {};
    const featuredProductsConfig: FeaturedProductsConfig = {};

    // ── Build home categories (shared between hero + carousel) ─────────────────
    const homeCategories: ShopCategory[] = categoryRows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      image_url: r.image_url,
      bg_color: r.bg_color,
      product_count: r._count.products,
    }));

    // ── Fetch products per home category (for CategoryCarousel) ────────────────
    const carouselLimit = categoryCarouselConfig.limit ?? 10;
    const categoryCarousels: CategoryCarouselItem[] = [];

    await prisma.$transaction(async (tx) => {
      for (const cat of categoryRows) {
        const categoryIds = [
          cat.id,
          ...cat.children.flatMap((child) => [
            child.id,
            ...child.children.map((sub) => sub.id),
          ]),
        ];

        const products = await tx.product.findMany({
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
          orderBy: [{ sort_order: "asc" }, { id: "desc" }],
          take: carouselLimit,
        });

        if (products.length > 0) {
          categoryCarousels.push({
            category: {
              id: cat.id,
              name: cat.name,
              slug: cat.slug,
              description: null,
            },
            products: products.map((r) => ({
              ...r,
              price: String(r.price),
              compare_at_price:
                r.compare_at_price !== null ? String(r.compare_at_price) : null,
            })),
          });
        }
      }
    });

    return {
      pageTitle: pageRow?.title ?? "Home",
      meta_info: (pageRow?.meta_info ?? {}) as Record<string, string>,
      themeConfig: pageThemeConfig,
      custom_css: pageRow?.custom_css ?? null,
      customThemeComponent,
      heroType,
      heroBannerProps: {
        tagline:
          heroBannerProps.tagline ??
          configRow?.tagline ??
          "Wear what you love.",
        description:
          heroBannerProps.description ??
          configRow?.description ??
          "Curated fashion for every occasion.",
        accentColor:
          heroBannerProps.accentColor ??
          (configRow?.theme_config as any)?.accent_color ??
          "#f59e0b",
        primaryColor:
          heroBannerProps.primaryColor ??
          (configRow?.theme_config as any)?.bg_color ??
          "#09090b",
        ctaCategory1Slug: heroBannerProps.ctaCategory1Slug,
        ctaCategory2Slug: heroBannerProps.ctaCategory2Slug,
        classOverrides: heroBannerProps.classOverrides ?? {},
      },
      heroCarouselProps: {
        autoPlayInterval: heroCarouselProps.autoPlayInterval ?? 5000,
        classOverrides: heroCarouselProps.classOverrides ?? {},
      },
      categoryCarouselConfig: {
        limit: carouselLimit,
        autoScrollInterval: categoryCarouselConfig.autoScrollInterval ?? 4000,
        classOverrides: categoryCarouselConfig.classOverrides ?? {},
      },
      featuredProductsConfig: {
        limit: featuredProductsConfig.limit ?? 4,
        classOverrides: featuredProductsConfig.classOverrides ?? {},
      },
      homeCategories,
      categoryCarousels,
    };
  },
);

// ─── 5. Featured Products ─────────────────────────────────────────────────────

export const getFeaturedProducts = cache(async function getFeaturedProducts(
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
});

// ─── 6. Category Page Data ────────────────────────────────────────────────────

const CATEGORY_PAGE_SIZE = 24;

export const getCategoryPageData = cache(async function getCategoryPageData(
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

  const [products, total] = await prisma.$transaction([
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
});

// ─── 7. Category Slugs ────────────────────────────────────────────────────────

export const getCategorySlugs = cache(async function getCategorySlugs(
  limit = 1,
): Promise<string[]> {
  const rows = await prisma.category.findMany({
    where: { is_active: true, deleted_at: null },
    select: { slug: true },
    take: limit,
  });
  return rows.map((r) => r.slug);
});

// ─── 8. Product Page Data ─────────────────────────────────────────────────────

export const getProductPageData = cache(async function getProductPageData(
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
});

// ─── 9. Product Page Slugs ────────────────────────────────────────────────────

export const getProductPageSlugs = cache(async function getProductPageSlugs(
  limit = 1,
): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: { is_active: true, deleted_at: null },
    select: { slug: true },
    take: limit,
  });
  return rows.map((r) => r.slug);
});

// ─── 10. Search Page Products ─────────────────────────────────────────────────

export const getSearchPageProducts = cache(async function getSearchPageProducts(
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

  const [rows, total] = await prisma.$transaction([
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
});

// ─── 11. Page Data ────────────────────────────────────────────────────────────

export const getPageThemeConfig = cache(async function getPageThemeConfig(
  slugs: string[],
): Promise<Record<string, any>> {
  const pageRow = await prisma.site_page.findFirst({
    where: { slug: { in: slugs }, is_active: true },
    select: { theme_config: true, custom_css: true },
  });
  const themeCfg = (pageRow?.theme_config ?? {}) as Record<string, any>;
  return {
    ...themeCfg,
    custom_css: pageRow?.custom_css ?? null,
  };
});

export const getPageData = cache(async function getPageData(
  slug: string,
): Promise<{ page: SitePage | null }> {
  const row = await prisma.site_page.findUnique({
    where: { slug, is_active: true },
    select: {
      title: true,
      content: true,
      custom_css: true,
      meta_info: true,
      theme_config: true,
    },
  });

  if (!row) return { page: null };

  return {
    page: {
      ...row,
      meta_info: (row.meta_info ?? {}) as Record<string, string>,
      theme_config: (row.theme_config ?? {}) as Record<string, unknown>,
      custom_css: row.custom_css ?? null,
    },
  };
});

// ─── 12. Hero Banner Data ─────────────────────────────────────────────────────

export const getHeroBannerData = cache(
  async function getHeroBannerData(): Promise<HeroBannerData> {
    const [config, categoryRows] = await prisma.$transaction([
      prisma.site_config.findFirst({ where: { deleted_at: null } }),
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

    const configTheme = (config?.theme_config ?? {}) as Record<string, any>;
    return {
      tagline: config?.tagline || "Wear what you love.",
      description: config?.description || "Curated fashion for every occasion.",
      accentColor: configTheme.accent_color || "#f59e0b",
      primaryColor: configTheme.bg_color || "#09090b",
      categories: categoryRows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        image_url: r.image_url,
        bg_color: r.bg_color,
        product_count: r._count.products,
      })),
    };
  },
);

// ─── 12b. All Categories Page Data ───────────────────────────────────────────

export const getAllCategoriesPageData = cache(
  async function getAllCategoriesPageData(): Promise<{
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
  },
);

export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***";
  const [user, domain] = email.split("@");
  const maskStr = (str: string) => {
    if (str.length <= 2) return str[0] + "*";
    return (
      str[0] + "*".repeat(Math.max(1, str.length - 2)) + str[str.length - 1]
    );
  };
  const domainParts = domain.split(".");
  const maskedDomainName = maskStr(domainParts[0]);
  const maskedDomain = [maskedDomainName, ...domainParts.slice(1)].join(".");
  return `${maskStr(user)}@${maskedDomain}`;
}

// ─── 14. Checkout Page Data ───────────────────────────────────────────────────

export const getCheckoutPageData = cache(
  async function getCheckoutPageData(): Promise<CheckoutPageData> {
    const stripeActive = isStripeConfigured();

    const [shippingMethods, paymentMethods, config] = await prisma.$transaction(
      [
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
          where: { is_active: true },
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
        prisma.site_config.findFirst({ where: { deleted_at: null } }),
      ],
    );

    const activePaymentMethods = (paymentMethods || []).filter((m) => {
      if (m.provider === "stripe") {
        return stripeActive;
      }
      return true;
    });

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
      paymentMethods: activePaymentMethods.map((m) => ({
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
            tax_rate: config.tax_rate !== null ? Number(config.tax_rate) : null,
            tax_inclusive: config.tax_inclusive,
            tax_label: config.tax_label,
            captcha_provider: config.captcha_provider ?? "none",
            turnstile_site_key:
              process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null,
            recaptcha_site_key:
              process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || null,
          }
        : null,
    };
  },
);

// ─── 15. Category Carousel Data ────────────────────────────────────────────────

export interface CategoryCarouselItem {
  category: {
    id: number;
    name: string;
    slug: string;
    description: string | null;
  };
  products: ProductCard[];
}

export const getHomeCategoryCarousels = cache(
  async function getHomeCategoryCarousels(
    limitPerCategory = 10,
  ): Promise<CategoryCarouselItem[]> {
    return await prisma.$transaction(async (tx) => {
      const categoryRows = await tx.category.findMany({
        where: { is_active: true, show_in_home: true, deleted_at: null },
        orderBy: { sort_order: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          children: {
            where: { is_active: true, deleted_at: null },
            select: {
              id: true,
              children: {
                where: { is_active: true, deleted_at: null },
                select: { id: true },
              },
            },
          },
        },
      });

      if (categoryRows.length === 0) {
        return [];
      }

      const carouselItems: CategoryCarouselItem[] = [];

      for (const cat of categoryRows) {
        const categoryIds = [
          cat.id,
          ...cat.children.flatMap((child) => [
            child.id,
            ...child.children.map((subChild) => subChild.id),
          ]),
        ];

        const products = await tx.product.findMany({
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
          orderBy: [{ sort_order: "asc" }, { id: "desc" }],
          take: limitPerCategory,
        });

        if (products.length > 0) {
          carouselItems.push({
            category: {
              id: cat.id,
              name: cat.name,
              slug: cat.slug,
              description: cat.description,
            },
            products: products.map((r) => ({
              ...r,
              price: String(r.price),
              compare_at_price:
                r.compare_at_price !== null ? String(r.compare_at_price) : null,
            })),
          });
        }
      }

      return carouselItems;
    });
  },
);
