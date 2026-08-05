import prisma from "@/lib/prisma";

export async function createSitePageTransaction(
  data: {
    slug: string;
    title: string;
    content: string;
    is_active?: boolean;
    show_in_header?: boolean;
    show_in_footer?: boolean;
    sort_order?: number;
    meta_info?: object;
    theme_config?: object;
    components_config?: object;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const page = await tx.site_page.create({
      data: {
        ...data,
        created_by: userId,
        updated_by: userId,
      },
    });
    return page;
  });
}

export async function updateSitePageTransaction(
  id: number,
  data: {
    slug?: string;
    title?: string;
    content?: string;
    is_active?: boolean;
    show_in_header?: boolean;
    show_in_footer?: boolean;
    sort_order?: number;
    meta_info?: object;
    theme_config?: object;
    components_config?: object;
  },
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.site_page.findUnique({ where: { id } });
    if (!existing) throw new Error("Page not found.");

    const updated = await tx.site_page.update({
      where: { id },
      data: {
        ...data,
        updated_by: userId,
      },
    });

    return { existing, updated };
  });
}

export async function deleteSitePageTransaction(id: number, userId: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.site_page.findUnique({ where: { id } });
    if (!existing) throw new Error("Page not found.");

    const updated = await tx.site_page.update({
      where: { id },
      data: {
        updated_by: userId,
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });

    return { existing, updated };
  });
}

export async function restoreSitePageTransaction(id: number, userId: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.site_page.findUnique({ where: { id } });
    if (!existing) throw new Error("Page not found.");

    const updated = await tx.site_page.update({
      where: { id },
      data: {
        updated_by: userId,
        deleted_at: null,
        deleted_by: null,
      },
    });

    return { existing, updated };
  });
}

export async function permanentlyDeleteSitePageTransaction(id: number) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.site_page.findUnique({ where: { id } });
    if (!existing) throw new Error("Page not found.");

    await tx.site_page.delete({ where: { id } });

    return { existing };
  });
}

export async function getPagesDashboardDataInDB(
  where: any,
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
        meta_info: true,
        created_at: true,
        created_by: true,
        updated_at: true,
        updated_by: true,
        deleted_at: true,
        deleted_by: true,
      },
      take: pageSize,
      skip: skipCount,
      orderBy: { id: "asc" },
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

export async function getPageEditDataInDB(id: number) {
  return await prisma.site_page.findUnique({
    where: { id, deleted_at: null },
    select: {
      id: true,
      slug: true,
      title: true,
      content: true,
      is_active: true,
      meta_info: true,
      created_at: true,
      created_by: true,
      updated_at: true,
      updated_by: true,
      deleted_at: true,
      deleted_by: true,
    },
  });
}

