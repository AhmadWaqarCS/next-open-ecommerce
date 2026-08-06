import prisma from "@/lib/prisma";

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
        show_in_header: true,
        show_in_footer: true,
        meta_info: true,
        created_at: true,
        created_by: true,
        updated_at: true,
        updated_by: true,
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


