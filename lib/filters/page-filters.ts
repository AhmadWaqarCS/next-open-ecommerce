import { Prisma } from "@/lib/generated/prisma/client";

export interface PageFilterParams {
  id?: string;
  title?: string;
  slug?: string;
  is_active?: string; // "true" | "false" | ""
}

export function buildPageWhereInput(
  params: PageFilterParams,
): Prisma.site_pageWhereInput {
  const where: Prisma.site_pageWhereInput = {
    deleted_at: null,
  };

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

  return where;
}
