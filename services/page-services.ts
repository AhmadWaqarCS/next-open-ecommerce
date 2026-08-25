import prisma from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { PROTECTED_SYSTEM_SLUGS } from "@/lib/types";

export async function createSitePageTransaction(
  data: {
    slug: string;
    title: string;
    content?: string | null;
    custom_css?: string | null;
    is_active?: boolean;
    show_in_header?: boolean;
    show_in_footer?: boolean;
    sort_order?: number;
    meta_info?: Record<string, any>;
    theme_config?: Record<string, any>;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.site_page.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      throw new Error(`A page with slug "${data.slug}" already exists.`);
    }

    return await tx.site_page.create({
      data: {
        slug: data.slug,
        title: data.title,
        content: data.content ?? null,
        custom_css: data.custom_css ?? null,
        is_active: data.is_active ?? true,
        show_in_header: data.show_in_header ?? false,
        show_in_footer: data.show_in_footer ?? true,
        sort_order: data.sort_order ?? 0,
        meta_info: (data.meta_info ?? {}) as Prisma.InputJsonValue,
        theme_config: (data.theme_config ?? {}) as Prisma.InputJsonValue,
        created_by: userId,
        updated_by: userId,
      },
    });
  });
}

export async function updateSitePageTransaction(
  id: number,
  data: {
    slug?: string;
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
    if (!existing) throw new Error("Page not found.");

    // If slug is being updated, check for conflicts & system protection
    if (data.slug && data.slug !== existing.slug) {
      if (PROTECTED_SYSTEM_SLUGS.includes(existing.slug)) {
        throw new Error(
          `The core system slug "${existing.slug}" cannot be modified.`,
        );
      }

      const slugConflict = await tx.site_page.findUnique({
        where: { slug: data.slug },
      });
      if (slugConflict && slugConflict.id !== id) {
        throw new Error(`A page with slug "${data.slug}" already exists.`);
      }
    }

    const updated = await tx.site_page.update({
      where: { id },
      data: {
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.custom_css !== undefined && { custom_css: data.custom_css }),
        ...(data.is_active !== undefined && { is_active: data.is_active }),
        ...(data.show_in_header !== undefined && {
          show_in_header: data.show_in_header,
        }),
        ...(data.show_in_footer !== undefined && {
          show_in_footer: data.show_in_footer,
        }),
        ...(data.sort_order !== undefined && { sort_order: data.sort_order }),
        ...(data.theme_config !== undefined && {
          theme_config: data.theme_config as Prisma.InputJsonValue,
        }),
        ...(data.meta_info !== undefined && {
          meta_info: data.meta_info as Prisma.InputJsonValue,
        }),
        updated_by: userId,
      },
    });

    return { existing, updated };
  });
}

export async function deleteSitePageTransaction(id: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.site_page.findUnique({ where: { id } });
    if (!existing) throw new Error("Page not found.");

    if (PROTECTED_SYSTEM_SLUGS.includes(existing.slug)) {
      throw new Error(
        `The core system page "${existing.title}" cannot be deleted.`,
      );
    }

    const deleted = await tx.site_page.delete({ where: { id } });
    return { existing: deleted };
  });
}

export async function toggleSitePageStatusTransaction(
  id: number,
  is_active: boolean,
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.site_page.findUnique({ where: { id } });
    if (!existing) throw new Error("Page not found.");

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

export async function bulkDeleteSitePagesTransaction(
  ids: number[],
  selectAllScope: boolean = false,
  filterWhere?: Prisma.site_pageWhereInput,
) {
  return await prisma.$transaction(async (tx) => {
    const whereCondition: Prisma.site_pageWhereInput = selectAllScope
      ? { ...(filterWhere ?? {}), slug: { notIn: PROTECTED_SYSTEM_SLUGS } }
      : { id: { in: ids }, slug: { notIn: PROTECTED_SYSTEM_SLUGS } };

    return await tx.site_page.deleteMany({
      where: whereCondition,
    });
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
