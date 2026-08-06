import { Prisma } from "@/lib/generated/prisma/client";

export interface SiteComponentFilterParams {
  id?: string;
  name?: string;
  component_key?: string;
  category?: string;
  description?: string;
  is_active?: string; // "true" | "false" | ""
  created_by?: string;
  created_from?: string;
  created_to?: string;
  updated_by?: string;
  updated_from?: string;
  updated_to?: string;
}

export function buildSiteComponentWhereInput(
  params: SiteComponentFilterParams,
): Prisma.site_componentWhereInput {
  const where: Prisma.site_componentWhereInput = {};

  // ID filter
  if (params.id && !isNaN(Number(params.id))) {
    where.id = Number(params.id);
  }

  // Name / Component Key / Description search
  if (params.name?.trim()) {
    const searchTerm = params.name.trim();
    where.OR = [
      { name: { contains: searchTerm, mode: "insensitive" } },
      { component_key: { contains: searchTerm, mode: "insensitive" } },
      { description: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  // Component Key specific filter
  if (params.component_key?.trim()) {
    where.component_key = {
      contains: params.component_key.trim(),
      mode: "insensitive",
    };
  }

  // Category filter
  if (params.category?.trim()) {
    where.category = {
      contains: params.category.trim(),
      mode: "insensitive",
    };
  }

  // Description filter
  if (params.description?.trim()) {
    where.description = {
      contains: params.description.trim(),
      mode: "insensitive",
    };
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
