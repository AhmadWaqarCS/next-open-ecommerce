import { Prisma } from "@/lib/generated/prisma/client";
import prisma from "@/lib/prisma";

export interface CategoryFilterParams {
  id?: string;
  name?: string;
  description?: string;
  is_active?: string; // "true" | "false" | ""
  hierarchy?: string; // "is_parent" | "is_child" | "has_children" | "no_children" | ""
  has_image?: string; // "true" | "false" | ""
  has_meta?: string; // "true" | "false" | ""
  bg_color?: string;
  min_products?: string;
  max_products?: string;
  created_by?: string;
  created_from?: string;
  created_to?: string;
  updated_by?: string;
  updated_from?: string;
  updated_to?: string;
}

export function buildCategoryWhereInput(
  params: CategoryFilterParams,
  isTrash: boolean = false
): Prisma.categoryWhereInput {
  const where: Prisma.categoryWhereInput = {};

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

  // Name / Slug includes
  if (params.name?.trim()) {
    const searchTerm = params.name.trim();
    where.OR = [
      { name: { contains: searchTerm, mode: "insensitive" } },
      { slug: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  // Description includes
  if (params.description?.trim()) {
    where.description = {
      contains: params.description.trim(),
      mode: "insensitive",
    };
  }

  // Active status
  if (params.is_active === "true") {
    where.is_active = true;
  } else if (params.is_active === "false") {
    where.is_active = false;
  }

  // Hierarchy
  if (params.hierarchy === "is_parent") {
    where.parent_id = null;
  } else if (params.hierarchy === "is_child") {
    where.parent_id = { not: null };
  } else if (params.hierarchy === "has_children") {
    where.children = { some: {} };
  } else if (params.hierarchy === "no_children") {
    where.children = { none: {} };
  }

  // Has Image
  if (params.has_image === "true") {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      { image_url: { not: null } },
      { image_url: { not: "" } },
    ];
  } else if (params.has_image === "false") {
    where.OR = [
      ...(where.OR ?? []),
      { image_url: null },
      { image_url: "" },
    ];
  }

  // Background color
  if (params.bg_color?.trim()) {
    where.bg_color = {
      contains: params.bg_color.trim(),
      mode: "insensitive",
    };
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

export async function getCategoryFilterWhere(
  params: CategoryFilterParams,
  isTrash: boolean = false
): Promise<Prisma.categoryWhereInput> {
  const where = buildCategoryWhereInput(params, isTrash);

  const minP =
    params.min_products !== undefined && params.min_products !== ""
      ? Number(params.min_products)
      : undefined;
  const maxP =
    params.max_products !== undefined && params.max_products !== ""
      ? Number(params.max_products)
      : undefined;

  if (
    (minP !== undefined && !isNaN(minP)) ||
    (maxP !== undefined && !isNaN(maxP))
  ) {
    if (minP === 0 && maxP === 0) {
      where.products = { none: {} };
    } else if (minP !== undefined && minP > 0 && maxP === undefined) {
      where.products = { some: {} };
    } else {
      const grouped = await prisma.product.groupBy({
        by: ["category_id"],
        _count: { id: true },
        where: { deleted_at: null, category_id: { not: null } },
      });

      const matchingCategoryIds = grouped
        .filter((g) => {
          const count = g._count.id;
          if (minP !== undefined && !isNaN(minP) && count < minP) return false;
          if (maxP !== undefined && !isNaN(maxP) && count > maxP) return false;
          return true;
        })
        .map((g) => g.category_id as number);

      const includeZero =
        (minP === undefined || (!isNaN(minP) && minP <= 0)) &&
        (maxP === undefined || (!isNaN(maxP) && maxP >= 0));

      if (includeZero) {
        where.OR = [
          ...(where.OR ?? []),
          { id: { in: matchingCategoryIds } },
          { products: { none: {} } },
        ];
      } else {
        where.id = { in: matchingCategoryIds };
      }
    }
  }

  return where;
}
