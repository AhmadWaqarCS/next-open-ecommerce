import { Prisma } from "@/lib/generated/prisma/client";

export interface EmailGroupFilterParams {
  id?: string;
  name?: string;
  search?: string;
  min_members?: string;
  max_members?: string;
  created_by?: string;
  created_from?: string;
  created_to?: string;
  updated_by?: string;
  updated_from?: string;
  updated_to?: string;
}

export function buildEmailGroupWhereInput(
  params: EmailGroupFilterParams,
): Prisma.email_groupWhereInput {
  const where: Prisma.email_groupWhereInput = {};

  // ID search
  if (params.id && !isNaN(Number(params.id))) {
    where.id = Number(params.id);
  }

  // Name / Search text filter
  const textQuery = params.name?.trim() || params.search?.trim();
  if (textQuery) {
    where.OR = [
      { name: { contains: textQuery, mode: "insensitive" } },
      { description: { contains: textQuery, mode: "insensitive" } },
    ];
  }

  // Member Count Range
  if (params.min_members || params.max_members) {
    where.member_count = {};
    if (params.min_members && !isNaN(Number(params.min_members))) {
      where.member_count.gte = Number(params.min_members);
    }
    if (params.max_members && !isNaN(Number(params.max_members))) {
      where.member_count.lte = Number(params.max_members);
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
      const toDate = new Date(params.created_to);
      toDate.setHours(23, 59, 59, 999);
      where.created_at.lte = toDate;
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
      const toDate = new Date(params.updated_to);
      toDate.setHours(23, 59, 59, 999);
      where.updated_at.lte = toDate;
    }
  }

  return where;
}

export async function getEmailGroupFilterWhere(
  params: EmailGroupFilterParams,
): Promise<Prisma.email_groupWhereInput> {
  return buildEmailGroupWhereInput(params);
}
