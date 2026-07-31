import { Prisma } from "@/lib/generated/prisma/client";
import prisma from "@/lib/prisma";

export interface RoleFilterParams {
  id?: string;
  name?: string;
  is_active?: string; // "true" | "false" | ""
  is_system?: string; // "true" | "false" | ""
  min_users?: string;
  max_users?: string;
  created_by?: string;
  created_from?: string;
  created_to?: string;
  updated_by?: string;
  updated_from?: string;
  updated_to?: string;
}

export function buildRoleWhereInput(
  params: RoleFilterParams,
  isTrash: boolean = false
): Prisma.roleWhereInput {
  const where: Prisma.roleWhereInput = {};

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

  // Name search
  if (params.name?.trim()) {
    where.name = {
      contains: params.name.trim(),
      mode: "insensitive",
    };
  }

  // Active status
  if (params.is_active === "true") {
    where.is_active = true;
  } else if (params.is_active === "false") {
    where.is_active = false;
  }

  // System role status
  if (params.is_system === "true") {
    where.name = "superadmin";
  } else if (params.is_system === "false") {
    where.NOT = {
      ...(where.NOT ? (where.NOT as object) : {}),
      name: "superadmin",
    };
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

export async function getRoleFilterWhere(
  params: RoleFilterParams,
  isTrash: boolean = false
): Promise<Prisma.roleWhereInput> {
  const where = buildRoleWhereInput(params, isTrash);

  const minU =
    params.min_users !== undefined && params.min_users !== ""
      ? Number(params.min_users)
      : undefined;
  const maxU =
    params.max_users !== undefined && params.max_users !== ""
      ? Number(params.max_users)
      : undefined;

  if (
    (minU !== undefined && !isNaN(minU)) ||
    (maxU !== undefined && !isNaN(maxU))
  ) {
    const grouped = await prisma.dashboard_user.groupBy({
      by: ["role_id"],
      _count: { id: true },
      where: { deleted_at: null },
    });

    const matchingRoleIds = grouped
      .filter((g) => {
        const count = g._count.id;
        if (minU !== undefined && !isNaN(minU) && count < minU) return false;
        if (maxU !== undefined && !isNaN(maxU) && count > maxU) return false;
        return true;
      })
      .map((g) => g.role_id);

    const includeZero =
      (minU === undefined || (!isNaN(minU) && minU <= 0)) &&
      (maxU === undefined || (!isNaN(maxU) && maxU >= 0));

    if (includeZero) {
      where.OR = [
        ...(where.OR ?? []),
        { id: { in: matchingRoleIds } },
        { users: { none: {} } },
      ];
    } else {
      where.id = { in: matchingRoleIds };
    }
  }

  return where;
}
