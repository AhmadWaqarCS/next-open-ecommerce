import { Suspense } from "react";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";
import { assertPermission } from "@/lib/guards";
import RoleTrashTable from "./role-trash-table";
import { resolveUserNames } from "@/lib/action-utils";
import Pagination from "@/app/(dashboard)/_components/pagination";
import { RoleFilterParams, getRoleFilterWhere } from "@/lib/filters/role-filters";
import { getRoleTrashDashboardDataInDB } from "@/services/role-services";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trash — Roles",
  description: "Deleted roles",
};

interface PageProps {
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}

export default function DashboardRolesTrashPage(props: PageProps) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardRolesTrashPageContent {...props} />
    </Suspense>
  );
}

async function DashboardRolesTrashPageContent({
  searchParams,
}: PageProps) {
  const { permissions } = await assertPermission("delete", "/dashboard/roles");
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

  const where = await getRoleFilterWhere(filterParams, true);

  const { roles, totalRoles, dashboardUsers } =
    await getRoleTrashDashboardDataInDB(where, skipCount, pageSize);

  const userIds = roles.flatMap((r) =>
    [r.created_by, r.updated_by, r.deleted_by].filter((id) => id !== null)
  ) as number[];
  const userNames = await resolveUserNames(userIds);

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <RoleTrashTable
        roles={roles as any}
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
