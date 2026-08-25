import { Prisma } from "@/lib/generated/prisma/client";

export interface ThemeFilterParams {
  id?: string;
  name?: string;
  slug?: string;
  is_active?: string; // "true" | "false" | ""
}

export function buildThemeWhereInput(
  params: ThemeFilterParams,
): Prisma.themeWhereInput {
  const where: Prisma.themeWhereInput = {};

  if (params.id && !isNaN(Number(params.id))) {
    where.id = Number(params.id);
  }

  if (params.name?.trim()) {
    const searchTerm = params.name.trim();
    where.OR = [
      { name: { contains: searchTerm, mode: "insensitive" } },
      { slug: { contains: searchTerm, mode: "insensitive" } },
      { description: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  if (params.slug?.trim()) {
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

  return where;
}
