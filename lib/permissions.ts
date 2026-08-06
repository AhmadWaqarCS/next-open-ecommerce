import { cacheLife, cacheTag } from "next/cache";
import prisma from "./prisma";
import { CRUD } from "./types";

export async function getRolePermissions(role: string) {
  "use cache";
  cacheTag(`admin-permissions-${role}`);
  cacheLife("max");
  try {
    const adminPermissions = await prisma.site_feature_role.findMany({
      where: {
        role: { name: role, is_active: true, deleted_at: null },
        site_feature: {
          enabled: true,
        },
      },
      select: {
        site_feature: { select: { path: true, name: true } },
        access_crud: true,
      },
    });

    const accessPaths = adminPermissions.map((r) => ({
      path: r.site_feature.path,
      crud: r.access_crud as CRUD,
      name: r.site_feature.name,
    }));

    return { accessPaths };
  } catch (error) {
    console.error("Error fetching role permissions:", error);
    return { accessPaths: [] };
  }
}
