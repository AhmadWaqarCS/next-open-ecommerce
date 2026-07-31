import { Prisma } from "@/lib/generated/prisma/client";

export interface ProductFilterParams {
  id?: string;
  name?: string;
  description?: string;
  category_id?: string;
  is_active?: string; // "true" | "false" | ""
  is_featured?: string; // "true" | "false" | ""
  stock_status?: string; // "in_stock" | "out_of_stock" | "low_stock" | ""
  min_stock?: string;
  max_stock?: string;
  min_price?: string;
  max_price?: string;
  on_sale?: string; // "true" | "false" | ""
  track_inventory?: string; // "true" | "false" | ""
  has_image?: string; // "true" | "false" | ""
  has_variants?: string; // "true" | "false" | ""
  has_meta?: string; // "true" | "false" | ""
  created_by?: string;
  created_from?: string;
  created_to?: string;
  updated_by?: string;
  updated_from?: string;
  updated_to?: string;
}

export function getProductFilterWhere(
  params: ProductFilterParams,
  isTrash: boolean = false
): Prisma.productWhereInput {
  const where: Prisma.productWhereInput = {};

  // Soft delete check
  if (isTrash) {
    where.NOT = { deleted_at: null };
  } else {
    where.deleted_at = null;
  }

  // ID filter
  if (params.id && !isNaN(Number(params.id))) {
    where.id = Number(params.id);
  }

  // Name / Slug / SKU includes
  if (params.name?.trim()) {
    const searchTerm = params.name.trim();
    where.OR = [
      { name: { contains: searchTerm, mode: "insensitive" } },
      { slug: { contains: searchTerm, mode: "insensitive" } },
      { sku: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  // Description includes
  if (params.description?.trim()) {
    const descTerm = params.description.trim();
    where.OR = [
      ...(where.OR ?? []),
      { description: { contains: descTerm, mode: "insensitive" } },
      { short_description: { contains: descTerm, mode: "insensitive" } },
    ];
  }

  // Category filter
  if (params.category_id) {
    if (params.category_id === "uncategorized") {
      where.category_id = null;
    } else if (!isNaN(Number(params.category_id))) {
      where.category_id = Number(params.category_id);
    }
  }

  // Active status
  if (params.is_active === "true") {
    where.is_active = true;
  } else if (params.is_active === "false") {
    where.is_active = false;
  }

  // Featured status
  if (params.is_featured === "true") {
    where.is_featured = true;
  } else if (params.is_featured === "false") {
    where.is_featured = false;
  }

  // Track inventory
  if (params.track_inventory === "true") {
    where.track_inventory = true;
  } else if (params.track_inventory === "false") {
    where.track_inventory = false;
  }

  // Stock status
  if (params.stock_status === "in_stock") {
    where.stock_quantity = { gt: 0 };
  } else if (params.stock_status === "out_of_stock") {
    where.stock_quantity = { lte: 0 };
  }

  // Min / Max Stock quantity
  const minStock =
    params.min_stock !== undefined && params.min_stock !== ""
      ? Number(params.min_stock)
      : undefined;
  const maxStock =
    params.max_stock !== undefined && params.max_stock !== ""
      ? Number(params.max_stock)
      : undefined;

  if (
    (minStock !== undefined && !isNaN(minStock)) ||
    (maxStock !== undefined && !isNaN(maxStock))
  ) {
    where.stock_quantity = {
      ...(where.stock_quantity && typeof where.stock_quantity === "object"
        ? where.stock_quantity
        : {}),
      ...(minStock !== undefined && !isNaN(minStock) ? { gte: minStock } : {}),
      ...(maxStock !== undefined && !isNaN(maxStock) ? { lte: maxStock } : {}),
    };
  }

  // Price range
  const minP =
    params.min_price !== undefined && params.min_price !== ""
      ? Number(params.min_price)
      : undefined;
  const maxP =
    params.max_price !== undefined && params.max_price !== ""
      ? Number(params.max_price)
      : undefined;

  if (
    (minP !== undefined && !isNaN(minP)) ||
    (maxP !== undefined && !isNaN(maxP))
  ) {
    where.price = {
      ...(minP !== undefined && !isNaN(minP) ? { gte: minP } : {}),
      ...(maxP !== undefined && !isNaN(maxP) ? { lte: maxP } : {}),
    };
  }

  // On Sale (compare_at_price > price)
  if (params.on_sale === "true") {
    where.compare_at_price = { not: null };
  } else if (params.on_sale === "false") {
    where.compare_at_price = null;
  }

  // Has Cover / Gallery Image
  if (params.has_image === "true") {
    where.OR = [
      ...(where.OR ?? []),
      { feature_image_url: { not: null } },
      { images: { some: {} } },
    ];
  } else if (params.has_image === "false") {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      { feature_image_url: null },
      { images: { none: {} } },
    ];
  }

  // Has Variants
  if (params.has_variants === "true") {
    where.variants = { some: {} };
  } else if (params.has_variants === "false") {
    where.variants = { none: {} };
  }

  // Has Meta Info
  if (params.has_meta === "true") {
    where.NOT = {
      ...(where.NOT ? (where.NOT as object) : {}),
      meta_info: { equals: {} },
    };
  } else if (params.has_meta === "false") {
    where.meta_info = { equals: {} };
  }

  // Created By
  if (params.created_by && !isNaN(Number(params.created_by))) {
    where.created_by = Number(params.created_by);
  }

  // Created At Range
  if (params.created_from || params.created_to) {
    where.created_at = {
      ...(params.created_from ? { gte: new Date(params.created_from) } : {}),
      ...(params.created_to
        ? { lte: new Date(params.created_to + "T23:59:59.999Z") }
        : {}),
    };
  }

  // Updated By
  if (params.updated_by && !isNaN(Number(params.updated_by))) {
    where.updated_by = Number(params.updated_by);
  }

  // Updated At Range
  if (params.updated_from || params.updated_to) {
    where.updated_at = {
      ...(params.updated_from ? { gte: new Date(params.updated_from) } : {}),
      ...(params.updated_to
        ? { lte: new Date(params.updated_to + "T23:59:59.999Z") }
        : {}),
    };
  }

  return where;
}
