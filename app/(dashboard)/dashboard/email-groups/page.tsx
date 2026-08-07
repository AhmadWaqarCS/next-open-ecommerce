import { assertPermission } from "@/lib/guards";
import EmailGroupTable from "./email-group-table";
import Pagination from "@/app/(dashboard)/_components/pagination";
import {
  EmailGroupFilterParams,
  getEmailGroupFilterWhere,
} from "@/lib/filters/email-group-filters";
import { getEmailGroupsDashboardDataInDB } from "@/services/email-group-services";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Email Groups",
  description: "Organize customer contact IDs into targeted subscriber segments",
};

export default async function EmailGroupsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const { permissions } = await assertPermission("read", "/dashboard/email-groups");
  const params = await searchParams;

  const currentPage = Math.max(1, Number(params?.page ?? 1));
  const pageSize = Math.max(1, Number(params?.size ?? 10));
  const skipCount = (currentPage - 1) * pageSize;

  const filterParams: EmailGroupFilterParams = {
    id: typeof params?.id === "string" ? params.id : undefined,
    name: typeof params?.name === "string" ? params.name : undefined,
    search: typeof params?.search === "string" ? params.search : undefined,
    min_members: typeof params?.min_members === "string" ? params.min_members : undefined,
    max_members: typeof params?.max_members === "string" ? params.max_members : undefined,
    created_from: typeof params?.created_from === "string" ? params.created_from : undefined,
    created_to: typeof params?.created_to === "string" ? params.created_to : undefined,
  };

  const where = await getEmailGroupFilterWhere(filterParams);

  const { groups, totalCount } = await getEmailGroupsDashboardDataInDB(
    where,
    skipCount,
    pageSize,
  );

  const serializedGroups = groups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    member_count: g._count.members,
    created_at: g.created_at.toISOString(),
  }));

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <EmailGroupTable
        groups={serializedGroups}
        filterParams={filterParams}
        permissions={permissions}
        totalCount={totalCount}
      />

      <Pagination
        totalItems={totalCount}
        currentPage={currentPage}
        pageSize={pageSize}
        itemName="groups"
      />
    </div>
  );
}
