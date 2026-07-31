import { Prisma } from "@/lib/generated/prisma/client";

export interface UserFilterParams {
  id?: string;
  name?: string;
  role_name?: string;
  is_active?: string; // "true" | "false" | ""
  created_by?: string;
  created_from?: string;
  created_to?: string;
  updated_by?: string;
  updated_from?: string;
  updated_to?: string;
}

export function getUserFilterWhere(
  params: UserFilterParams,
  isTrash: boolean = false
): Prisma.dashboard_userWhereInput {
  const where: Prisma.dashboard_userWhereInput = {};

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

  // Name / Email search
  if (params.name?.trim()) {
    const searchTerm = params.name.trim();
    where.OR = [
      { name: { contains: searchTerm, mode: "insensitive" } },
      { email: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  // Role filter
  if (params.role_name?.trim()) {
    where.role_name = params.role_name.trim();
  }

  // Active status
  if (params.is_active === "true") {
    where.is_active = true;
  } else if (params.is_active === "false") {
    where.is_active = false;
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
