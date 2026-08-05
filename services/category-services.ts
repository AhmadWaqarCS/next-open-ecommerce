import prisma from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export async function createCategoryTransaction(
  data: {
    name: string;
    slug: string;
    description?: string | null;
    image_url?: string | null;
    image_alt_text?: string | null;
    bg_color?: string | null;
    show_in_header?: boolean;
    show_in_footer?: boolean;
    show_in_home?: boolean;
    parent_id?: number | null;
    sort_order?: number;
    is_active?: boolean;
    meta_info?: object;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const category = await tx.category.create({
      data: {
        ...data,
        created_by: userId,
        updated_by: userId,
      },
    });

    let parentSlug: string | null = null;
    if (category.parent_id) {
      const parent = await tx.category.findUnique({
        where: { id: category.parent_id },
        select: { slug: true },
      });
      parentSlug = parent?.slug || null;
    }

    return { category, parentSlug };
  });
}

export async function updateCategoryTransaction(
  id: number,
  data: {
    name?: string;
    slug?: string;
    description?: string | null;
    image_url?: string | null;
    image_alt_text?: string | null;
    bg_color?: string | null;
    show_in_header?: boolean;
    show_in_footer?: boolean;
    show_in_home?: boolean;
    parent_id?: number | null;
    sort_order?: number;
    is_active?: boolean;
    meta_info?: object;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.category.findUnique({
      where: { id },
      include: { parent: { select: { slug: true } } },
    });
    if (!existing) throw new Error("Category not found.");

    const removedMediaUrls: string[] = [];
    if (
      data.image_url !== undefined &&
      data.image_url !== existing.image_url &&
      existing.image_url
    ) {
      removedMediaUrls.push(existing.image_url);
    }

    const updated = await tx.category.update({
      where: { id },
      data: { ...data, updated_by: userId },
    });

    let newParentSlug: string | null = null;
    if (data.parent_id && data.parent_id !== existing.parent_id) {
      const parent = await tx.category.findUnique({
        where: { id: data.parent_id },
        select: { slug: true },
      });
      newParentSlug = parent?.slug || null;
    }

    return {
      existing,
      updated,
      newParentSlug,
      removedMediaUrls: Array.from(new Set(removedMediaUrls.filter(Boolean))),
    };
  });
}

export async function deleteCategoryTransaction(id: number, userId: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.category.findUnique({
      where: { id },
      include: { parent: { select: { slug: true } } },
    });
    if (!existing) throw new Error("Category not found.");

    await tx.category.update({
      where: { id },
      data: { updated_by: userId, deleted_at: new Date(), deleted_by: userId },
    });

    return { existing };
  });
}

export async function restoreCategoryTransaction(id: number, userId: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.category.findUnique({
      where: { id },
      include: { parent: { select: { slug: true } } },
    });
    if (!existing) throw new Error("Category not found.");

    await tx.category.update({
      where: { id },
      data: { updated_by: userId, deleted_at: null, deleted_by: null },
    });

    return { existing };
  });
}

export async function permanentlyDeleteCategoryTransaction(id: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.category.findUnique({
      where: { id },
      include: { parent: { select: { slug: true } } },
    });
    if (!existing) throw new Error("Category not found.");

    const removedMediaUrls: string[] = [];
    if (existing.image_url) removedMediaUrls.push(existing.image_url);

    await tx.category.delete({ where: { id } });

    return { existing, removedMediaUrls };
  });
}

export async function bulkDeleteCategoriesTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.categoryWhereInput,
  userId: number = 0,
) {
  return await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.categoryWhereInput = selectAllScope
      ? (filterWhere ?? { deleted_at: null })
      : { id: { in: ids } };

    const affected = await tx.category.findMany({
      where: whereCondition,
      select: {
        id: true,
        slug: true,
        show_in_header: true,
        show_in_footer: true,
        show_in_home: true,
        parent_id: true,
        parent: { select: { slug: true } },
      },
    });

    await tx.category.updateMany({
      where: whereCondition,
      data: { updated_by: userId, deleted_at: new Date(), deleted_by: userId },
    });

    return { affected };
  });
}

export async function bulkRestoreCategoriesTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.categoryWhereInput,
  userId: number = 0,
) {
  return await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.categoryWhereInput = selectAllScope
      ? (filterWhere ?? { NOT: { deleted_at: null } })
      : { id: { in: ids } };

    const affected = await tx.category.findMany({
      where: whereCondition,
      select: {
        id: true,
        slug: true,
        show_in_header: true,
        show_in_footer: true,
        show_in_home: true,
        parent_id: true,
        parent: { select: { slug: true } },
      },
    });

    await tx.category.updateMany({
      where: whereCondition,
      data: { updated_by: userId, deleted_at: null, deleted_by: null },
    });

    return { affected };
  });
}

export async function bulkPermanentlyDeleteCategoriesTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.categoryWhereInput,
) {
  return await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.categoryWhereInput = selectAllScope
      ? (filterWhere ?? { NOT: { deleted_at: null } })
      : { id: { in: ids } };

    const affected = await tx.category.findMany({
      where: whereCondition,
      select: {
        id: true,
        slug: true,
        image_url: true,
        show_in_header: true,
        show_in_footer: true,
        show_in_home: true,
        parent_id: true,
        parent: { select: { slug: true } },
      },
    });

    const removedMediaUrls = affected
      .map((c) => c.image_url)
      .filter(Boolean) as string[];

    await tx.category.deleteMany({ where: whereCondition });

    return { affected, removedMediaUrls };
  });
}

export async function getCategoriesDashboardDataInDB(
  where: Prisma.categoryWhereInput,
  skipCount: number,
  pageSize: number,
) {
  return await prisma.$transaction(async (tx) => {
    const categories = await tx.category.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image_url: true,
        image_alt_text: true,
        bg_color: true,
        meta_info: true,
        parent_id: true,
        sort_order: true,
        is_active: true,
        created_at: true,
        created_by: true,
        updated_at: true,
        updated_by: true,
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      },
      take: pageSize,
      skip: skipCount,
      orderBy: { sort_order: "asc" },
    });

    const totalCategories = await tx.category.count({ where });

    const allCategories = await tx.category.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    const dashboardUsers = await tx.dashboard_user.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    return { categories, totalCategories, allCategories, dashboardUsers };
  });
}

export async function getParentCategoriesInDB() {
  return await prisma.category.findMany({
    where: { deleted_at: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getCategoryEditDataInDB(categoryId: number) {
  return await prisma.$transaction(async (tx) => {
    const category = await tx.category.findUnique({
      where: { id: categoryId, deleted_at: null },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image_url: true,
        image_alt_text: true,
        bg_color: true,
        meta_info: true,
        parent_id: true,
        sort_order: true,
        is_active: true,
      },
    });

    if (!category) return null;

    const parentCategories = await tx.category.findMany({
      where: { deleted_at: null, NOT: { id: categoryId } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return { category, parentCategories };
  });
}

export async function getCategoryTrashDashboardDataInDB(
  where: Prisma.categoryWhereInput,
  skipCount: number,
  pageSize: number,
) {
  return await prisma.$transaction(async (tx) => {
    const categories = await tx.category.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image_url: true,
        image_alt_text: true,
        bg_color: true,
        meta_info: true,
        parent_id: true,
        sort_order: true,
        is_active: true,
        created_at: true,
        created_by: true,
        updated_at: true,
        updated_by: true,
        deleted_at: true,
        deleted_by: true,
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      },
      take: pageSize,
      skip: skipCount,
      orderBy: { deleted_at: "desc" },
    });

    const totalCategories = await tx.category.count({ where });

    const dashboardUsers = await tx.dashboard_user.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    return { categories, totalCategories, dashboardUsers };
  });
}

