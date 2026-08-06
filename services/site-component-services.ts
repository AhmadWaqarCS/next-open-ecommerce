import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

export async function toggleSiteComponentStatusTransaction(
  id: number,
  is_active: boolean,
  userId: number,
) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.site_component.findUnique({ where: { id } });
    if (!existing) throw new Error("Component not found.");

    const updated = await tx.site_component.update({
      where: { id },
      data: {
        is_active,
        updated_by: userId,
      },
    });

    return { existing, updated };
  });
}

export async function getSiteComponentsDashboardDataInDB(
  where: Prisma.site_componentWhereInput,
  skipCount: number = 0,
  pageSize: number = 10,
) {
  return await prisma.$transaction(async (tx) => {
    const components = await tx.site_component.findMany({
      where,
      take: pageSize,
      skip: skipCount,
      orderBy: { id: "asc" },
    });

    const totalComponents = await tx.site_component.count({ where });

    const dashboardUsers = await tx.dashboard_user.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    return { components, totalComponents, dashboardUsers };
  });
}

