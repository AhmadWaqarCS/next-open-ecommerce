import { Prisma } from "@/lib/generated/prisma/client";

export interface SecretFilterParams {
  id?: string;
  name?: string; // searches key_name or description
  created_by?: string;
  created_from?: string;
  created_to?: string;
  updated_by?: string;
  updated_from?: string;
  updated_to?: string;
}

export function getSecretFilterWhere(
  params: SecretFilterParams,
  isTrash: boolean = false
): Prisma.secret_vaultWhereInput {
  const where: Prisma.secret_vaultWhereInput = {};

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

  // Key name / Description search
  if (params.name?.trim()) {
    const searchTerm = params.name.trim();
    where.OR = [
      { key_name: { contains: searchTerm, mode: "insensitive" } },
      { description: { contains: searchTerm, mode: "insensitive" } },
    ];
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
