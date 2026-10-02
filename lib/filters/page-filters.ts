import { Prisma } from "@/lib/generated/prisma/client";

export interface PageFilterParams {
  id?: string;
  title?: string;
  slug?: string;
  search?: string;
  is_active?: string; // "true" | "false" | ""
  show_in_header?: string; // "true" | "false" | ""
  show_in_footer?: string; // "true" | "false" | ""
  created_by?: string;
  created_from?: string;
  created_to?: string;
  updated_by?: string;
  updated_from?: string;
  updated_to?: string;
}

export function buildPageWhereInput(
  params: PageFilterParams,
): Prisma.site_pageWhereInput {
  const where: Prisma.site_pageWhereInput = {};

  // ID filter
  if (params.id && !isNaN(Number(params.id))) {
    where.id = Number(params.id);
  }

  // Search filter (unified search across title and slug)
  if (params.search?.trim()) {
    const term = params.search.trim();
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { slug: { contains: term, mode: "insensitive" } },
    ];
  } else {
    // Individual title / slug filters
    if (params.title?.trim()) {
      where.title = { contains: params.title.trim(), mode: "insensitive" };
    }
    if (params.slug?.trim()) {
      where.slug = { contains: params.slug.trim(), mode: "insensitive" };
    }
  }

  // Status filter
  if (params.is_active === "true") {
    where.is_active = true;
  } else if (params.is_active === "false") {
    where.is_active = false;
  }

  // Navigation menu filters
  if (params.show_in_header === "true") {
    where.show_in_header = true;
  } else if (params.show_in_header === "false") {
    where.show_in_header = false;
  }

  if (params.show_in_footer === "true") {
    where.show_in_footer = true;
  } else if (params.show_in_footer === "false") {
    where.show_in_footer = false;
  }

  // Audit user filters
  if (params.created_by && !isNaN(Number(params.created_by))) {
    where.created_by = Number(params.created_by);
  }
  if (params.updated_by && !isNaN(Number(params.updated_by))) {
    where.updated_by = Number(params.updated_by);
  }

  // Date Range: Created At
  if (params.created_from || params.created_to) {
    where.created_at = {};
    if (params.created_from) {
      where.created_at.gte = new Date(`${params.created_from}T00:00:00.000Z`);
    }
    if (params.created_to) {
      where.created_at.lte = new Date(`${params.created_to}T23:59:59.999Z`);
    }
  }

  // Date Range: Updated At
  if (params.updated_from || params.updated_to) {
    where.updated_at = {};
    if (params.updated_from) {
      where.updated_at.gte = new Date(`${params.updated_from}T00:00:00.000Z`);
    }
    if (params.updated_to) {
      where.updated_at.lte = new Date(`${params.updated_to}T23:59:59.999Z`);
    }
  }

  return where;
}
