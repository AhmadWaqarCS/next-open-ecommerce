import { resolveUserNames } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import Pagination from "@/app/(dashboard)/_components/pagination";
import {
  buildSiteComponentWhereInput,
  SiteComponentFilterParams,
} from "@/lib/filters/site-component-filters";
import { getSiteComponentsDashboardDataInDB } from "@/services/site-component-services";
import SiteComponentTable from "./site-component-table";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Site Components",
  description: "Manage system and custom UI components registered for dynamic storefront pages.",
};

export default async function DashboardSiteComponentsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const { permissions } = await assertPermission(
    "read",
    "/dashboard/site-components",
  );
  const params = (await searchParams) || {};

  const currentPage = Math.max(1, Number(params.page ?? 1));
  const pageSize = Math.max(1, Number(params.size ?? 10));
  const skipCount = (currentPage - 1) * pageSize;

  const filterParams: SiteComponentFilterParams = {
    id: typeof params.id === "string" ? params.id : undefined,
    name: typeof params.name === "string" ? params.name : undefined,
    component_key:
      typeof params.component_key === "string"
        ? params.component_key
        : undefined,
    category: typeof params.category === "string" ? params.category : undefined,
    description:
      typeof params.description === "string" ? params.description : undefined,
    is_active:
      typeof params.is_active === "string" ? params.is_active : undefined,
    created_by:
      typeof params.created_by === "string" ? params.created_by : undefined,
    created_from:
      typeof params.created_from === "string" ? params.created_from : undefined,
    created_to:
      typeof params.created_to === "string" ? params.created_to : undefined,
    updated_by:
      typeof params.updated_by === "string" ? params.updated_by : undefined,
    updated_from:
      typeof params.updated_from === "string" ? params.updated_from : undefined,
    updated_to:
      typeof params.updated_to === "string" ? params.updated_to : undefined,
  };

  const where = buildSiteComponentWhereInput(filterParams);

  const { components, totalComponents, dashboardUsers } =
    await getSiteComponentsDashboardDataInDB(where, skipCount, pageSize);

  const userIds = components.flatMap((c) =>
    [c.created_by, c.updated_by].filter((id): id is number => id !== null),
  );
  const userNames = await resolveUserNames(userIds);

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <SiteComponentTable
        components={components as any}
        dashboardUsers={dashboardUsers}
        filterParams={filterParams}
        permissions={permissions}
        userNames={userNames}
        totalCount={totalComponents}
      />

      <Pagination
        totalItems={totalComponents}
        currentPage={currentPage}
        pageSize={pageSize}
        itemName="site components"
      />
    </div>
  );
}
