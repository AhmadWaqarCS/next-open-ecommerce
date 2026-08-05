import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

export async function createSiteComponentInDB(data: {
  name: string;
  component_key: string;
  category?: string;
  description?: string | null;
  default_props?: object;
  thumbnail_url?: string | null;
  is_active?: boolean;
  created_by: number;
  updated_by: number;
}) {
  return await prisma.site_component.create({
    data: {
      ...data,
      default_props: data.default_props ?? Prisma.JsonNull,
    },
  });
}

export async function updateSiteComponentInDB(
  id: number,
  data: {
    name?: string;
    component_key?: string;
    category?: string;
    description?: string | null;
    default_props?: object;
    thumbnail_url?: string | null;
    is_active?: boolean;
    updated_by: number;
    deleted_at?: Date | null;
    deleted_by?: number | null;
  },
) {
  return await prisma.site_component.update({
    where: { id },
    data: {
      ...data,
      default_props:
        data.default_props !== undefined
          ? (data.default_props ?? Prisma.JsonNull)
          : undefined,
    },
  });
}

export async function deleteSiteComponentPermanentlyInDB(id: number) {
  return await prisma.site_component.delete({ where: { id } });
}

export async function bulkUpdateSiteComponentsInDB(
  ids: number[],
  data: {
    updated_by: number;
    deleted_at?: Date | null;
    deleted_by?: number | null;
  },
  selectAllScope: boolean = false,
  isTrash: boolean = false,
  filterWhere?: Prisma.site_componentWhereInput,
) {
  const whereCondition: any = selectAllScope
    ? (filterWhere ?? (isTrash ? { NOT: { deleted_at: null } } : { deleted_at: null }))
    : { id: { in: ids } };

  return await prisma.site_component.updateMany({
    where: whereCondition,
    data,
  });
}

export async function bulkDeleteSiteComponentsPermanentlyInDB(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.site_componentWhereInput,
) {
  const whereCondition: any = selectAllScope
    ? (filterWhere ?? { NOT: { deleted_at: null } })
    : { id: { in: ids } };

  return await prisma.site_component.deleteMany({
    where: whereCondition,
  });
}
