import { Prisma } from "@/lib/generated/prisma/client";

export interface ShippingFilterParams {
  id?: string;
  name?: string;
  description?: string;
  min_price?: string;
  max_price?: string;
  has_free_over?: string; // "true" | "false" | ""
  is_active?: string; // "true" | "false" | ""
  created_by?: string;
  created_from?: string;
  created_to?: string;
  updated_by?: string;
  updated_from?: string;
  updated_to?: string;
  deleted_by?: string;
  deleted_from?: string;
  deleted_to?: string;
}

export function buildShippingWhereInput(
  params: ShippingFilterParams,
  isTrash: boolean = false
): Prisma.shipping_methodWhereInput {
  const where: Prisma.shipping_methodWhereInput = {};

  // Soft delete filter
  if (isTrash) {
    where.NOT = { deleted_at: null };
  } else {
    where.deleted_at = null;
  }

  // ID search
  if (params.id && !isNaN(Number(params.id))) {
    where.id = Number(params.id);
  }

  // Name search
  if (params.name?.trim()) {
    where.name = { contains: params.name.trim(), mode: "insensitive" };
  }

  // Description search
  if (params.description?.trim()) {
    where.description = { contains: params.description.trim(), mode: "insensitive" };
  }

  // Price range
  if (params.min_price || params.max_price) {
    where.price = {};
    if (params.min_price && !isNaN(Number(params.min_price))) {
      where.price.gte = Number(params.min_price);
    }
    if (params.max_price && !isNaN(Number(params.max_price))) {
      where.price.lte = Number(params.max_price);
    }
  }

  // Has free_over threshold option
  if (params.has_free_over === "true") {
    where.free_over = { not: null };
  } else if (params.has_free_over === "false") {
    where.free_over = null;
  }

  // Active status
  if (params.is_active === "true") {
    where.is_active = true;
  } else if (params.is_active === "false") {
    where.is_active = false;
  }

  // Created By User
  if (params.created_by && !isNaN(Number(params.created_by))) {
    where.created_by = Number(params.created_by);
  }

  // Created Date Range
  if (params.created_from || params.created_to) {
    where.created_at = {
      ...(params.created_from ? { gte: new Date(params.created_from) } : {}),
      ...(params.created_to
        ? { lte: new Date(params.created_to + "T23:59:59.999Z") }
        : {}),
    };
  }

  // Updated By User
  if (params.updated_by && !isNaN(Number(params.updated_by))) {
    where.updated_by = Number(params.updated_by);
  }

  // Updated Date Range
  if (params.updated_from || params.updated_to) {
    where.updated_at = {
      ...(params.updated_from ? { gte: new Date(params.updated_from) } : {}),
      ...(params.updated_to
        ? { lte: new Date(params.updated_to + "T23:59:59.999Z") }
        : {}),
    };
  }

  // Deleted By User (Trash table)
  if (isTrash && params.deleted_by && !isNaN(Number(params.deleted_by))) {
    where.deleted_by = Number(params.deleted_by);
  }

  // Deleted Date Range (Trash table)
  if (isTrash && (params.deleted_from || params.deleted_to)) {
    where.deleted_at = {
      ...(params.deleted_from ? { gte: new Date(params.deleted_from) } : {}),
      ...(params.deleted_to
        ? { lte: new Date(params.deleted_to + "T23:59:59.999Z") }
        : {}),
    };
  }

  return where;
}

export async function getShippingFilterWhere(
  params: ShippingFilterParams,
  isTrash: boolean = false
): Promise<Prisma.shipping_methodWhereInput> {
  return buildShippingWhereInput(params, isTrash);
}
