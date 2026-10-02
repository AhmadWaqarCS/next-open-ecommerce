import { Prisma } from "@/lib/generated/prisma/client";

export interface CouponFilterParams {
  id?: string;
  code?: string;
  discount_type?: string;
  is_active?: string; // "true" | "false" | ""
  min_discount?: string;
  max_discount?: string;
  usage_status?: string; // "unlimited" | "exhausted" | "available" | ""
  starts_from?: string;
  starts_to?: string;
  expires_from?: string;
  expires_to?: string;
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

export function buildCouponWhereInput(
  params: CouponFilterParams,
  isTrash: boolean = false,
): Prisma.couponWhereInput {
  const where: Prisma.couponWhereInput = {};

  // Soft delete filter
  if (isTrash) {
    where.NOT = { deleted_at: null };
  } else {
    where.deleted_at = null;
  }

  // ID filter
  if (params.id && !isNaN(Number(params.id))) {
    where.id = Number(params.id);
  }

  // Code search (case-insensitive substring)
  if (params.code?.trim()) {
    where.code = { contains: params.code.trim(), mode: "insensitive" };
  }

  // Discount Type filter
  if (
    params.discount_type === "percentage" ||
    params.discount_type === "fixed_amount"
  ) {
    where.discount_type = params.discount_type;
  }

  // Active status
  if (params.is_active === "true") {
    where.is_active = true;
  } else if (params.is_active === "false") {
    where.is_active = false;
  }

  // Discount value range
  if (params.min_discount || params.max_discount) {
    where.discount_value = {};
    if (params.min_discount && !isNaN(Number(params.min_discount))) {
      where.discount_value.gte = Number(params.min_discount);
    }
    if (params.max_discount && !isNaN(Number(params.max_discount))) {
      where.discount_value.lte = Number(params.max_discount);
    }
  }

  // Usage Status filter
  if (params.usage_status === "unlimited") {
    where.max_uses = null;
  }

  // Starts At Date Range
  if (params.starts_from || params.starts_to) {
    where.starts_at = {};
    if (params.starts_from) {
      where.starts_at.gte = new Date(params.starts_from);
    }
    if (params.starts_to) {
      where.starts_at.lte = new Date(params.starts_to + "T23:59:59.999Z");
    }
  }

  // Expires At Date Range
  if (params.expires_from || params.expires_to) {
    where.expires_at = {};
    if (params.expires_from) {
      where.expires_at.gte = new Date(params.expires_from);
    }
    if (params.expires_to) {
      where.expires_at.lte = new Date(params.expires_to + "T23:59:59.999Z");
    }
  }

  // Created By User
  if (params.created_by && !isNaN(Number(params.created_by))) {
    where.created_by = Number(params.created_by);
  }

  // Created Date Range
  if (params.created_from || params.created_to) {
    where.created_at = {};
    if (params.created_from) {
      where.created_at.gte = new Date(params.created_from);
    }
    if (params.created_to) {
      where.created_at.lte = new Date(params.created_to + "T23:59:59.999Z");
    }
  }

  // Updated By User
  if (params.updated_by && !isNaN(Number(params.updated_by))) {
    where.updated_by = Number(params.updated_by);
  }

  // Updated Date Range
  if (params.updated_from || params.updated_to) {
    where.updated_at = {};
    if (params.updated_from) {
      where.updated_at.gte = new Date(params.updated_from);
    }
    if (params.updated_to) {
      where.updated_at.lte = new Date(params.updated_to + "T23:59:59.999Z");
    }
  }

  // Deleted By User (for Trash)
  if (params.deleted_by && !isNaN(Number(params.deleted_by))) {
    where.deleted_by = Number(params.deleted_by);
  }

  // Deleted Date Range (for Trash)
  if (params.deleted_from || params.deleted_to) {
    where.deleted_at = {
      ...(params.deleted_from ? { gte: new Date(params.deleted_from) } : {}),
      ...(params.deleted_to
        ? { lte: new Date(params.deleted_to + "T23:59:59.999Z") }
        : {}),
    };
  }

  return where;
}

export async function getCouponFilterWhere(
  params: CouponFilterParams,
  isTrash: boolean = false,
): Promise<Prisma.couponWhereInput> {
  return buildCouponWhereInput(params, isTrash);
}
