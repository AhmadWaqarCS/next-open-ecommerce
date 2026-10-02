import prisma from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export async function updateSitePageTransaction(
  id: number,
  data: {
    title?: string;
    content?: string | null;
    custom_css?: string | null;
    is_active?: boolean;
    show_in_header?: boolean;
    show_in_footer?: boolean;
    sort_order?: number;
    theme_config?: unknown;
    meta_info?: Record<string, any>;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.site_page.findUnique({ where: { id } });
    if (!existing) throw new Error("PAGE_NOT_FOUND");

    const updateData: Prisma.site_pageUpdateInput = {
      updated_by: userId,
    };

    // Field diffing
    if (data.title !== undefined && data.title.trim() !== existing.title) {
      updateData.title = data.title.trim();
    }
    if (data.content !== undefined && data.content !== existing.content) {
      updateData.content = data.content;
    }
    if (data.custom_css !== undefined && data.custom_css !== existing.custom_css) {
      updateData.custom_css = data.custom_css;
    }
    if (data.is_active !== undefined && data.is_active !== existing.is_active) {
      updateData.is_active = data.is_active;
    }
    if (
      data.show_in_header !== undefined &&
      data.show_in_header !== existing.show_in_header
    ) {
      updateData.show_in_header = data.show_in_header;
    }
    if (
      data.show_in_footer !== undefined &&
      data.show_in_footer !== existing.show_in_footer
    ) {
      updateData.show_in_footer = data.show_in_footer;
    }
    if (data.sort_order !== undefined && data.sort_order !== existing.sort_order) {
      updateData.sort_order = data.sort_order;
    }
    if (data.theme_config !== undefined) {
      updateData.theme_config = data.theme_config as Prisma.InputJsonValue;
    }
    if (data.meta_info !== undefined) {
      updateData.meta_info = data.meta_info as Prisma.InputJsonValue;
    }

    const updated = await tx.site_page.update({
      where: { id },
      data: updateData,
    });

    return { existing, updated };
  });
}

export async function toggleSitePageStatusTransaction(
  id: number,
  is_active: boolean,
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.site_page.findUnique({ where: { id } });
    if (!existing) throw new Error("PAGE_NOT_FOUND");

    const updated = await tx.site_page.update({
      where: { id },
      data: {
        is_active,
        updated_by: userId,
      },
    });

    return { existing, updated };
  });
}

export async function bulkToggleSitePagesStatusTransaction(
  ids: number[],
  is_active: boolean,
  selectAllScope: boolean = false,
  filterWhere?: Prisma.site_pageWhereInput,
  userId: number = 0,
) {
  return await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.site_pageWhereInput = selectAllScope
      ? (filterWhere ?? {})
      : { id: { in: ids } };

    return await tx.site_page.updateMany({
      where: whereCondition,
      data: { is_active, updated_by: userId },
    });
  });
}

export async function getPagesDashboardDataInDB(
  where: Prisma.site_pageWhereInput,
  skipCount: number,
  pageSize: number,
) {
  return await prisma.$transaction(async (tx) => {
    const pagesRaw = await tx.site_page.findMany({
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        content: true,
        is_active: true,
        show_in_header: true,
        show_in_footer: true,
        sort_order: true,
        meta_info: true,
        theme_config: true,
        custom_css: true,
        created_at: true,
        created_by: true,
        updated_at: true,
        updated_by: true,
      },
      take: pageSize,
      skip: skipCount,
      orderBy: [{ sort_order: "asc" }, { id: "asc" }],
    });

    const totalPages = await tx.site_page.count({ where });

    const dashboardUsers = await tx.dashboard_user.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    return { pagesRaw, totalPages, dashboardUsers };
  });
}

// Backward compatibility alias
export const updateSitePageConfigInDB = async (
  id: number,
  data: Parameters<typeof updateSitePageTransaction>[1],
  userId: number,
) => {
  const { updated } = await updateSitePageTransaction(id, data, userId);
  return updated;
};
