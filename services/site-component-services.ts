import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

export async function createSiteComponentTransaction(
  data: {
    name: string;
    component_key: string;
    category?: string;
    description?: string | null;
    default_props?: object;
    thumbnail_url?: string | null;
    is_active?: boolean;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    return await tx.site_component.create({
      data: {
        ...data,
        default_props: data.default_props ?? Prisma.JsonNull,
        created_by: userId,
        updated_by: userId,
      },
    });
  });
}

export async function updateSiteComponentTransaction(
  id: number,
  data: {
    name?: string;
    component_key?: string;
    category?: string;
    description?: string | null;
    default_props?: object;
    thumbnail_url?: string | null;
    is_active?: boolean;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.site_component.findUnique({ where: { id } });
    if (!existing) throw new Error("Component not found.");

    const removedMediaUrls: string[] = [];
    if (
      data.thumbnail_url !== undefined &&
      data.thumbnail_url !== existing.thumbnail_url &&
      existing.thumbnail_url
    ) {
      removedMediaUrls.push(existing.thumbnail_url);
    }

    const updated = await tx.site_component.update({
      where: { id },
      data: {
        ...data,
        default_props:
          data.default_props !== undefined
            ? (data.default_props ?? Prisma.JsonNull)
            : undefined,
        updated_by: userId,
      },
    });

    return { existing, updated, removedMediaUrls };
  });
}

export async function deleteSiteComponentTransaction(id: number, userId: number) {
  return await prisma.$transaction(async (tx) => {
    return await tx.site_component.update({
      where: { id },
      data: { updated_by: userId, deleted_at: new Date(), deleted_by: userId },
    });
  });
}

export async function restoreSiteComponentTransaction(
  id: number,
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    return await tx.site_component.update({
      where: { id },
      data: { updated_by: userId, deleted_at: null, deleted_by: null },
    });
  });
}

export async function permanentlyDeleteSiteComponentTransaction(id: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.site_component.findUnique({ where: { id } });
    if (!existing) throw new Error("Component not found.");

    await tx.site_component.delete({ where: { id } });

    const removedMediaUrls: string[] = [];
    if (existing.thumbnail_url) removedMediaUrls.push(existing.thumbnail_url);

    return { existing, removedMediaUrls };
  });
}

export async function bulkDeleteSiteComponentsTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  isTrash: boolean = false,
  userId: number = 0,
) {
  return await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.site_componentWhereInput = selectAllScope
      ? isTrash
        ? { NOT: { deleted_at: null } }
        : { deleted_at: null }
      : { id: { in: ids } };

    return await tx.site_component.updateMany({
      where: whereCondition,
      data: { updated_by: userId, deleted_at: new Date(), deleted_by: userId },
    });
  });
}

export async function bulkRestoreSiteComponentsTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  isTrash: boolean = true,
  userId: number = 0,
) {
  return await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.site_componentWhereInput = selectAllScope
      ? isTrash
        ? { NOT: { deleted_at: null } }
        : { deleted_at: null }
      : { id: { in: ids } };

    return await tx.site_component.updateMany({
      where: whereCondition,
      data: { updated_by: userId, deleted_at: null, deleted_by: null },
    });
  });
}

export async function bulkPermanentlyDeleteSiteComponentsTransaction(
  ids: number[],
  selectAllScope: boolean = false,
) {
  return await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.site_componentWhereInput = selectAllScope
      ? { NOT: { deleted_at: null } }
      : { id: { in: ids } };

    const affected = await tx.site_component.findMany({
      where: whereCondition,
      select: { id: true, thumbnail_url: true },
    });

    const removedMediaUrls = affected
      .map((c) => c.thumbnail_url)
      .filter(Boolean) as string[];

    await tx.site_component.deleteMany({ where: whereCondition });

    return { affected, removedMediaUrls };
  });
}
