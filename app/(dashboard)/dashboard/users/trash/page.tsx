import { assertPermission } from "@/lib/guards";
import prisma from "@/lib/prisma";
import UserTrashTable from "./user-trash-table";
import { resolveUserNames } from "@/lib/action-utils";
import Pagination from "@/app/(dashboard)/_components/pagination";
import { UserFilterParams, getUserFilterWhere } from "@/lib/filters/user-filters";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trash Users",
  description: "Trash Users",
};

export default async function DashboardUsersTrashPage({
  searchParams,
}: {
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const { permissions } = await assertPermission("delete", "/dashboard/users");
  const params = await searchParams;

  const currentPage = Math.max(1, Number(params?.page ?? 1));
  const pageSize = Math.max(1, Number(params?.size ?? 10));
  const skipCount = (currentPage - 1) * pageSize;

  const filterParams: UserFilterParams = {
    id: typeof params?.id === "string" ? params.id : undefined,
    name: typeof params?.name === "string" ? params.name : undefined,
    role_name: typeof params?.role_name === "string" ? params.role_name : undefined,
    is_active: typeof params?.is_active === "string" ? params.is_active : undefined,
    created_by: typeof params?.created_by === "string" ? params.created_by : undefined,
    created_from: typeof params?.created_from === "string" ? params.created_from : undefined,
    created_to: typeof params?.created_to === "string" ? params.created_to : undefined,
    updated_by: typeof params?.updated_by === "string" ? params.updated_by : undefined,
    updated_from: typeof params?.updated_from === "string" ? params.updated_from : undefined,
    updated_to: typeof params?.updated_to === "string" ? params.updated_to : undefined,
  };

  const where = getUserFilterWhere(filterParams, true);

  const [users, roles, totalUsers, dashboardUsers] = await Promise.all([
    prisma.dashboard_user.findMany({
      where,
      select: {
        id: true,
        email: true,
        role_name: true,
        is_active: true,
        name: true,
        created_by: true,
        updated_by: true,
        deleted_by: true,
        deleted_at: true,
      },
      take: pageSize,
      skip: skipCount,
      orderBy: { deleted_at: "desc" },
    }),
    prisma.role.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.dashboard_user.count({ where }),
    prisma.dashboard_user.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const userIds = users.flatMap((u) =>
    [u.created_by, u.updated_by, u.deleted_by].filter((id) => id !== null)
  ) as number[];
  const userNames = await resolveUserNames(userIds);

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <UserTrashTable
        users={users}
        roles={roles}
        dashboardUsers={dashboardUsers}
        filterParams={filterParams}
        permissions={permissions}
        userNames={userNames}
        totalCount={totalUsers}
      />

      <Pagination
        totalItems={totalUsers}
        currentPage={currentPage}
        pageSize={pageSize}
        itemName="users"
      />
    </div>
  );
}
