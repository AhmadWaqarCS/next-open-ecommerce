import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Pagination from "@/app/(dashboard)/_components/pagination";
import { resolveUserNames } from "@/lib/action-utils";
import { getSecretFilterWhere, SecretFilterParams } from "@/lib/filters/secret-filters";
import { getConnectedSecretsMap } from "@/services/secret-services";
import SecretVaultTrashTable from "./secret-vault-trash-table";
import { CRUD } from "@/lib/types";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trash — Secret Vault",
  description: "View and restore deleted secrets",
};

export default async function DashboardSecretVaultTrashPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();

  // Strictly enforce Superadmin role access
  if (!session?.user || session.user.role !== "superadmin") {
    redirect("/dashboard");
  }

  const params = await searchParams;

  const currentPage = Math.max(1, Number(params?.page ?? 1));
  const pageSize = Math.max(1, Number(params?.size ?? 10));
  const skipCount = (currentPage - 1) * pageSize;

  const filterParams: SecretFilterParams = {
    id: typeof params?.id === "string" ? params.id : undefined,
    name: typeof params?.name === "string" ? params.name : undefined,
    created_by: typeof params?.created_by === "string" ? params.created_by : undefined,
    created_from: typeof params?.created_from === "string" ? params.created_from : undefined,
    created_to: typeof params?.created_to === "string" ? params.created_to : undefined,
    updated_by: typeof params?.updated_by === "string" ? params.updated_by : undefined,
    updated_from: typeof params?.updated_from === "string" ? params.updated_from : undefined,
    updated_to: typeof params?.updated_to === "string" ? params.updated_to : undefined,
  };

  const where = getSecretFilterWhere(filterParams, true);

  const [secrets, totalSecrets, dashboardUsers, connectedMap] = await Promise.all([
    prisma.secret_vault.findMany({
      where,
      select: {
        id: true,
        key_name: true,
        description: true,
        deleted_at: true,
        deleted_by: true,
        created_at: true,
        created_by: true,
        updated_at: true,
        updated_by: true,
      },
      take: pageSize,
      skip: skipCount,
      orderBy: { deleted_at: "desc" },
    }),
    prisma.secret_vault.count({ where }),
    prisma.dashboard_user.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    getConnectedSecretsMap(),
  ]);

  const userIds = secrets
    .flatMap((s) => [s.created_by, s.updated_by, s.deleted_by])
    .filter((id): id is number => id !== null && id !== undefined);

  const userNames = await resolveUserNames(userIds);

  // Full CRUD permissions granted for superadmin
  const superAdminPermissions: CRUD = {
    create: true,
    read: true,
    update: true,
    delete: true,
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <SecretVaultTrashTable
        secrets={secrets}
        connectedMap={connectedMap}
        dashboardUsers={dashboardUsers}
        filterParams={filterParams}
        permissions={superAdminPermissions}
        userNames={userNames}
        totalCount={totalSecrets}
      />

      <Pagination
        totalItems={totalSecrets}
        currentPage={currentPage}
        pageSize={pageSize}
        itemName="deleted secrets"
      />
    </div>
  );
}
