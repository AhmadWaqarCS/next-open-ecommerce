import { Prisma } from "@/lib/generated/prisma/client";

export interface ThemeFilterParams {
  id?: string;
  search?: string;
  name?: string;
  slug?: string;
  is_active?: string; // "true" | "false" | ""
  created_by?: string;
  created_from?: string;
  created_to?: string;
}

export function buildThemeWhereInput(
  params: ThemeFilterParams,
): Prisma.themeWhereInput {
  const where: Prisma.themeWhereInput = {};

  if (params.id && !isNaN(Number(params.id))) {
    where.id = Number(params.id);
  }

  const query = params.search?.trim() || params.name?.trim();
  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { slug: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
    ];
  }

  if (params.slug?.trim() && !query) {
    where.slug = {
      contains: params.slug.trim(),
      mode: "insensitive",
    };
  }

  if (params.is_active === "true") {
    where.is_active = true;
  } else if (params.is_active === "false") {
    where.is_active = false;
  }

  if (params.created_by && !isNaN(Number(params.created_by))) {
    where.created_by = Number(params.created_by);
  }

  if (params.created_from || params.created_to) {
    where.created_at = {};
    if (params.created_from) {
      const fromDate = new Date(params.created_from);
      if (!isNaN(fromDate.getTime())) {
        where.created_at.gte = fromDate;
      }
    }
    if (params.created_to) {
      const toDate = new Date(params.created_to);
      if (!isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        where.created_at.lte = toDate;
      }
    }
  }

  return where;
}
