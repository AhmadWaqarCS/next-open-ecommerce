import { assertPermission } from "@/lib/guards";
import prisma from "@/lib/prisma";
import RoleTable from "./role-table";
import { resolveUserNames } from "@/lib/action-utils";
import Pagination from "@/app/(dashboard)/_components/pagination";
import { RoleFilterParams, getRoleFilterWhere } from "@/lib/filters/role-filters";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Roles",
  description: "Manage dashboard roles and their permissions",
};

export default async function DashboardRolesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const { permissions } = await assertPermission("read", "/dashboard/roles");
  const params = await searchParams;

  const currentPage = Math.max(1, Number(params?.page ?? 1));
  const pageSize = Math.max(1, Number(params?.size ?? 10));
  const skipCount = (currentPage - 1) * pageSize;

  const filterParams: RoleFilterParams = {
    id: typeof params?.id === "string" ? params.id : undefined,
    name: typeof params?.name === "string" ? params.name : undefined,
    is_active: typeof params?.is_active === "string" ? params.is_active : undefined,
    is_system: typeof params?.is_system === "string" ? params.is_system : undefined,
    min_users: typeof params?.min_users === "string" ? params.min_users : undefined,
    max_users: typeof params?.max_users === "string" ? params.max_users : undefined,
    created_by: typeof params?.created_by === "string" ? params.created_by : undefined,
    created_from: typeof params?.created_from === "string" ? params.created_from : undefined,
    created_to: typeof params?.created_to === "string" ? params.created_to : undefined,
    updated_by: typeof params?.updated_by === "string" ? params.updated_by : undefined,
    updated_from: typeof params?.updated_from === "string" ? params.updated_from : undefined,
    updated_to: typeof params?.updated_to === "string" ? params.updated_to : undefined,
  };

  const where = await getRoleFilterWhere(filterParams, false);

  const [roles, siteFeatures, totalRoles, dashboardUsers] = await Promise.all([
    prisma.role.findMany({
      where,
      select: {
        id: true,
        name: true,
        is_active: true,
        created_by: true,
        updated_by: true,
        site_feature_roles: {
          select: {
            site_feature_id: true,
            access_crud: true,
            site_feature: {
              select: { id: true, name: true, path: true, enabled: true, is_super: true },
            },
          },
        },
      },
      take: pageSize,
      skip: skipCount,
      orderBy: { name: "asc" },
    }),
    prisma.site_feature.findMany({ orderBy: { name: "asc" } }),
    prisma.role.count({ where }),
    prisma.dashboard_user.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const userIds = roles.flatMap((r) => [r.created_by, r.updated_by]);
  const userNames = await resolveUserNames(userIds);

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <RoleTable
        roles={roles as any}
        siteFeatures={siteFeatures}
        dashboardUsers={dashboardUsers}
        filterParams={filterParams}
        permissions={permissions}
        userNames={userNames}
        totalCount={totalRoles}
      />

      <Pagination
        totalItems={totalRoles}
        currentPage={currentPage}
        pageSize={pageSize}
        itemName="roles"
      />
    </div>
  );
}
