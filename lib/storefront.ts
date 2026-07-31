// lib/storefront.ts
// All queries use explicit select: {} — no include: {} on hot paths.
// React cache() deduplicates within a single request.
import prisma from "./prisma";
import { cache } from "react";

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
  email: string | null;
  phone: string | null;
  address: string | null;
  social_links: Record<string, string | null>;
  currency: string;
  currency_symbol: string;
  meta_info: Record<string, string>;
  topbar_message: string | null;
  home_tagline_label: string | null;
}

export interface NavCategory {
  id: number;
  name: string;
  slug: string;
  children: { id: number; name: string; slug: string }[];
}

export interface ShopCategory {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  bg_color: string | null;
  product_count: number;
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

export interface CheckoutConfig {
  currency: string;
  currency_symbol: string;
  require_phone: boolean;
  allow_order_notes: boolean;
  tax_rate: number | null;
  tax_inclusive: boolean;
  tax_label: string;
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

export interface SitePage {
  title: string;
  content: string;
  meta_info: Record<string, string>;
}

// ─── Site Config ──────────────────────────────────────────────────────────────

export const getSiteConfig = cache(
  async (): Promise<StorefrontConfig | null> => {
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
        email: true,
        phone: true,
        address: true,
        social_links: true,
        currency: true,
        currency_symbol: true,
        meta_info: true,
        topbar_message: true,
        home_tagline_label: true,
      },
    });
    if (!row) return null;
    return {
      ...row,
      social_links: (row.social_links ?? {}) as Record<string, string | null>,
      meta_info: (row.meta_info ?? {}) as Record<string, string>,
    };
  },
);

// ─── Navigation Categories (header nav) ───────────────────────────────────────
// Only top-level + their children — no product count needed.

export const getCategories = cache(async (): Promise<NavCategory[]> => {
  return prisma.category.findMany({
    where: { is_active: true, parent_id: null, deleted_at: null },
    select: {
      id: true,
      name: true,
      slug: true,
      children: {
        where: { is_active: true, deleted_at: null },
        select: { id: true, name: true, slug: true },
        orderBy: { sort_order: "asc" },
      },
    },
    orderBy: { sort_order: "asc" },
  });
});

// ─── Shop Categories (home page grid) ─────────────────────────────────────────
// Includes product count and bg_color — no include: {} needed.

export const getShopCategoriesWithCount = cache(
  async (): Promise<ShopCategory[]> => {
    const rows = await prisma.category.findMany({
      where: { is_active: true, deleted_at: null },
      select: {
        id: true,
        name: true,
        slug: true,
        image_url: true,
        bg_color: true,
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
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      image_url: r.image_url,
      bg_color: r.bg_color,
      product_count: r._count.products,
    }));
  },
);

// ─── Shipping Methods ─────────────────────────────────────────────────────────

export const getShippingMethods = cache(
  async (): Promise<StorefrontShippingMethod[]> => {
    const methods = await prisma.shipping_method.findMany({
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
    });
    return methods.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      price: Number(m.price),
      free_over: m.free_over !== null ? Number(m.free_over) : null,
      estimated_days_min: m.estimated_days_min,
      estimated_days_max: m.estimated_days_max,
    }));
  },
);

// ─── Payment Methods ──────────────────────────────────────────────────────────

export const getPaymentMethods = cache(
  async (): Promise<StorefrontPaymentMethod[]> => {
    const methods = await prisma.payment_method.findMany({
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
    });
    return methods.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      provider: m.provider,
      extra_charge: m.extra_charge !== null ? Number(m.extra_charge) : null,
      instructions: m.instructions,
    }));
  },
);

// ─── Featured Products ────────────────────────────────────────────────────────
// Uses feature_image_url directly — no join to product_images.

export const getFeaturedProducts = cache(
  async (limit = 8): Promise<ProductCard[]> => {
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
    return rows.map((r) => ({
      ...r,
      price: String(r.price),
      compare_at_price:
        r.compare_at_price !== null ? String(r.compare_at_price) : null,
    }));
  },
);

// ─── Category Products (paginated) ───────────────────────────────────────────

const CATEGORY_PAGE_SIZE = 24;

export async function getCategoryProducts(
  slug: string,
  page = 1,
): Promise<{
  category: {
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
}> {
  const skip = (page - 1) * CATEGORY_PAGE_SIZE;

  const categoryRow = await prisma.category.findUnique({
    where: { slug, is_active: true, deleted_at: null },
    select: {
      id: true,
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

  const pageCount = Math.ceil(total / CATEGORY_PAGE_SIZE);

  return {
    category: categoryRow
      ? {
          ...categoryRow,
          meta_info: (categoryRow.meta_info ?? {}) as Record<string, string>,
        }
      : null,
    products: products.map((r) => ({
      ...r,
      price: String(r.price),
      compare_at_price:
        r.compare_at_price !== null ? String(r.compare_at_price) : null,
    })),
    total,
    page,
    pageSize: CATEGORY_PAGE_SIZE,
    pageCount,
  };
}

// ─── Single Product (full detail) ─────────────────────────────────────────────

export const getProductBySlug = cache(
  async (slug: string): Promise<ProductFull | null> => {
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
    if (!row) return null;
    return {
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
    };
  },
);

// ─── Static Page (about, contact) ─────────────────────────────────────────────

import type { Metadata } from "next";

export const getPageBySlug = cache(
  async (slug: string): Promise<SitePage | null> => {
    const row = await prisma.site_page.findUnique({
      where: { slug, is_active: true, deleted_at: null },
      select: { title: true, content: true, meta_info: true },
    });
    if (!row) return null;
    return {
      ...row,
      meta_info: (row.meta_info ?? {}) as Record<string, string>,
    };
  },
);

export async function getPolicyMetadata(slug: string): Promise<Metadata> {
  const [config, page] = await Promise.all([
    getSiteConfig(),
    getPageBySlug(slug),
  ]);

  if (!page) {
    return { title: "Page Not Found" };
  }

  const meta = page.meta_info ?? {};
  return {
    title: meta.title ?? `${page.title} | ${config?.name ?? "Store"}`,
    description: meta.description ?? undefined,
  };
}

// ─── Search (no cache — called dynamically) ───────────────────────────────────

export async function searchProducts(
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

// ─── All active category slugs (for generateStaticParams) ────────────────────

export async function getAllCategorySlugs(limit = 1): Promise<string[]> {
  const rows = await prisma.category.findMany({
    where: { is_active: true, deleted_at: null },
    select: { slug: true },
    take: limit,
  });
  return rows.map((r) => r.slug);
}

// ─── All active product slugs (for generateStaticParams) ─────────────────────

export async function getAllProductSlugs(): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: { is_active: true, deleted_at: null },
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}

export async function getTopProductSlugs(limit = 30): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: { is_active: true, deleted_at: null },
    select: { slug: true },
    orderBy: { is_featured: "desc" }, // or popular sales
    take: limit,
  });
  return rows.map((r) => r.slug);
}

// ─── Checkout Config ──────────────────────────────────────────────────────────
// Fetches only checkout-relevant fields. Always fresh (called at checkout time).

export const getCheckoutConfig = cache(
  async (): Promise<CheckoutConfig | null> => {
    const row = await prisma.site_config.findFirst({
      where: { deleted_at: null },
      select: {
        currency: true,
        currency_symbol: true,
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
      tax_rate: row.tax_rate !== null ? Number(row.tax_rate) : null,
    };
  },
);

// ─── Public Order (confirmation page) ────────────────────────────────────────
// Safe subset of order — no admin fields, no internal notes.

export async function getOrderByNumberPublic(
  orderNumber: string,
): Promise<PublicOrder | null> {
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
  if (!row) return null;
  return {
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
  };
}

export async function getCouponByCodeFromDB(code: string) {
  return await prisma.coupon.findFirst({
    where: {
      code,
      is_active: true,
      deleted_at: null,
      starts_at: { lte: new Date() },
      OR: [{ expires_at: null }, { expires_at: { gte: new Date() } }],
    },
  });
}
