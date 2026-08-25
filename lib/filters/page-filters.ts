import { Prisma } from "@/lib/generated/prisma/client";

export interface PageFilterParams {
  id?: string;
  title?: string;
  slug?: string;
  is_active?: string; // "true" | "false" | ""
  show_in_header?: string; // "true" | "false" | ""
  show_in_footer?: string; // "true" | "false" | ""
}

export function buildPageWhereInput(
  params: PageFilterParams,
): Prisma.site_pageWhereInput {
  const where: Prisma.site_pageWhereInput = {};

  if (params.id && !isNaN(Number(params.id))) {
    where.id = Number(params.id);
  }

  if (params.title?.trim()) {
    where.title = { contains: params.title.trim(), mode: "insensitive" };
  }

  if (params.slug?.trim()) {
    where.slug = { contains: params.slug.trim(), mode: "insensitive" };
  }

  if (params.is_active === "true") {
    where.is_active = true;
  } else if (params.is_active === "false") {
    where.is_active = false;
  }

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

  return where;
}
