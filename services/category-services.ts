import prisma from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { deleteMediaFromStorage, bulkDeleteMediaFromStorage } from "@/services/storage-services";

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
    // 1. Slug uniqueness check
    const existingSlug = await tx.category.findUnique({
      where: { slug: data.slug },
      select: { id: true },
    });
    if (existingSlug) {
      throw new Error("CATEGORY_SLUG_EXISTS");
    }

    // 2. Parent existence check
    let parentSlug: string | null = null;
    if (data.parent_id) {
      const parent = await tx.category.findUnique({
        where: { id: data.parent_id },
        select: { id: true, slug: true, deleted_at: true },
      });
      if (!parent || parent.deleted_at !== null) {
        throw new Error("CATEGORY_PARENT_NOT_FOUND");
      }
      parentSlug = parent.slug;
    }

    const category = await tx.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        image_url: data.image_url ?? null,
        image_alt_text: data.image_alt_text ?? null,
        bg_color: data.bg_color ?? null,
        show_in_header: data.show_in_header ?? true,
        show_in_footer: data.show_in_footer ?? true,
        show_in_home: data.show_in_home ?? true,
        parent_id: data.parent_id ?? null,
        sort_order: data.sort_order ?? 0,
        is_active: data.is_active ?? true,
        meta_info: data.meta_info ?? {},
        created_by: userId,
        updated_by: userId,
      },
    });

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
  let oldImageUrl: string | null = null;

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.category.findUnique({
      where: { id },
      include: { parent: { select: { slug: true } } },
    });
    if (!existing) throw new Error("Category not found.");

    // 1. Slug uniqueness check
    if (data.slug !== undefined && data.slug !== existing.slug) {
      const slugConflict = await tx.category.findFirst({
        where: { slug: data.slug, NOT: { id } },
        select: { id: true },
      });
      if (slugConflict) {
        throw new Error("CATEGORY_SLUG_EXISTS");
      }
    }

    // 2. Parent & Circular hierarchy checks
    let newParentSlug: string | null = null;
    if (data.parent_id !== undefined && data.parent_id !== existing.parent_id) {
      if (data.parent_id === id) {
        throw new Error("CATEGORY_SELF_PARENT");
      }

      if (data.parent_id !== null) {
        const parent = await tx.category.findUnique({
          where: { id: data.parent_id },
          select: { id: true, slug: true, parent_id: true, deleted_at: true },
        });
        if (!parent || parent.deleted_at !== null) {
          throw new Error("CATEGORY_PARENT_NOT_FOUND");
        }
        newParentSlug = parent.slug;

        // Circular hierarchy detection: walk upwards from the candidate parent
        let currentAncestorId: number | null = parent.parent_id;
        while (currentAncestorId) {
          if (currentAncestorId === id) {
            throw new Error("CATEGORY_CIRCULAR_HIERARCHY");
          }
          const next = await tx.category.findUnique({
            where: { id: currentAncestorId },
            select: { parent_id: true },
          });
          currentAncestorId = next?.parent_id ?? null;
        }
      }
    }

    const updatePayload: Record<string, any> = {};

    // Compare fields and include ONLY changed values
    if (data.name !== undefined && data.name !== existing.name) updatePayload.name = data.name;
    if (data.slug !== undefined && data.slug !== existing.slug) updatePayload.slug = data.slug;
    if (data.description !== undefined && data.description !== existing.description) updatePayload.description = data.description;
    if (data.image_alt_text !== undefined && data.image_alt_text !== existing.image_alt_text) updatePayload.image_alt_text = data.image_alt_text;
    if (data.bg_color !== undefined && data.bg_color !== existing.bg_color) updatePayload.bg_color = data.bg_color;
    if (data.show_in_header !== undefined && data.show_in_header !== existing.show_in_header) updatePayload.show_in_header = data.show_in_header;
    if (data.show_in_footer !== undefined && data.show_in_footer !== existing.show_in_footer) updatePayload.show_in_footer = data.show_in_footer;
    if (data.show_in_home !== undefined && data.show_in_home !== existing.show_in_home) updatePayload.show_in_home = data.show_in_home;
    if (data.parent_id !== undefined && data.parent_id !== existing.parent_id) updatePayload.parent_id = data.parent_id;
    if (data.sort_order !== undefined && data.sort_order !== existing.sort_order) updatePayload.sort_order = data.sort_order;
    if (data.is_active !== undefined && data.is_active !== existing.is_active) updatePayload.is_active = data.is_active;
    if (data.meta_info !== undefined && JSON.stringify(data.meta_info) !== JSON.stringify(existing.meta_info)) updatePayload.meta_info = data.meta_info;

    if (data.image_url !== undefined && data.image_url !== existing.image_url) {
      updatePayload.image_url = data.image_url;
      if (existing.image_url) oldImageUrl = existing.image_url;
    }

    let updated = existing as any;
    if (Object.keys(updatePayload).length > 0) {
      updatePayload.updated_by = userId;
      updated = await tx.category.update({
        where: { id },
        data: updatePayload,
      });
    }

    return { existing, updated, newParentSlug };
  });

  // Delete old image AFTER DB commit — fire-and-forget
  if (oldImageUrl) {
    deleteMediaFromStorage(oldImageUrl).catch((err) =>
      console.warn(`[Category Update] Failed to delete old image '${oldImageUrl}':`, err)
    );
  }

  return result;
}

export async function toggleCategoryStatusTransaction(
  id: number,
  is_active: boolean,
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.category.findUnique({
      where: { id },
      include: { parent: { select: { slug: true } } },
    });
    if (!existing) throw new Error("Category not found.");

    const updated = await tx.category.update({
      where: { id },
      data: {
        is_active,
        updated_by: userId,
      },
    });

    return { existing, updated };
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
  const { existing } = await prisma.$transaction(async (tx) => {
    const existing = await tx.category.findUnique({
      where: { id },
      include: { parent: { select: { slug: true } } },
    });
    if (!existing) throw new Error("Category not found.");

    // 1. Guard against orphaned subcategories
    const childCount = await tx.category.count({ where: { parent_id: id } });
    if (childCount > 0) {
      throw new Error(`CATEGORY_HAS_CHILDREN:${childCount}`);
    }

    // 2. Guard against foreign key constraint violation with products
    const productCount = await tx.product.count({ where: { category_id: id } });
    if (productCount > 0) {
      throw new Error(`CATEGORY_HAS_PRODUCTS:${productCount}`);
    }

    await tx.category.delete({ where: { id } });

    return { existing };
  });

  // Delete associated media AFTER DB delete — fire-and-forget
  if (existing.image_url) {
    deleteMediaFromStorage(existing.image_url).catch((err) =>
      console.warn(`[Category Delete] Failed to delete image '${existing.image_url}':`, err)
    );
  }

  return { existing };
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
  const { affected, skippedCount } = await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.categoryWhereInput = selectAllScope
      ? (filterWhere ?? { NOT: { deleted_at: null } })
      : { id: { in: ids } };

    const candidates = await tx.category.findMany({
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
        _count: {
          select: {
            children: true,
            products: true,
          },
        },
      },
    });

    // Only permanently delete categories that have NO subcategories and NO products
    const eligible = candidates.filter(
      (c) => c._count.children === 0 && c._count.products === 0,
    );
    const skipped = candidates.length - eligible.length;

    if (eligible.length > 0) {
      const eligibleIds = eligible.map((c) => c.id);
      await tx.category.deleteMany({
        where: { id: { in: eligibleIds } },
      });
    }

    return { affected: eligible, skippedCount: skipped };
  });

  // Delete all collected media URLs AFTER DB delete — fire-and-forget
  const mediaUrls = affected.map((c) => c.image_url).filter(Boolean) as string[];
  if (mediaUrls.length > 0) {
    bulkDeleteMediaFromStorage(mediaUrls).catch((err) =>
      console.warn(`[Category Bulk Delete] Failed to delete some media:`, err)
    );
  }

  return { affected, skippedCount };
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
