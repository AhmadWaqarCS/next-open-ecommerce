import { resolveUserNames, serializeShippingMethods } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import Pagination from "@/app/(dashboard)/_components/pagination";
import { ShippingFilterParams, buildShippingWhereInput } from "@/lib/filters/shipping-filters";
import { getShippingDashboardDataInDB } from "@/services/shipping-services";
import ShippingTable from "./shipping-table";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping Methods",
  description: "Manage store delivery methods, pricing tiers, and delivery estimates.",
};

export default async function DashboardShippingPage({
  searchParams,
}: {
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const { permissions } = await assertPermission("read", "/dashboard/shipping");
  const params = (await searchParams) ?? {};

  const currentPage = Math.max(1, Number(params?.page ?? 1));
  const pageSize = Math.max(1, Number(params?.size ?? 10));
  const skipCount = (currentPage - 1) * pageSize;

  const filterParams: ShippingFilterParams = {
    id: typeof params?.id === "string" ? params.id : undefined,
    name: typeof params?.name === "string" ? params.name : undefined,
    description: typeof params?.description === "string" ? params.description : undefined,
    min_price: typeof params?.min_price === "string" ? params.min_price : undefined,
    max_price: typeof params?.max_price === "string" ? params.max_price : undefined,
    has_free_over: typeof params?.has_free_over === "string" ? params.has_free_over : undefined,
    is_active: typeof params?.is_active === "string" ? params.is_active : undefined,
    created_by: typeof params?.created_by === "string" ? params.created_by : undefined,
    created_from: typeof params?.created_from === "string" ? params.created_from : undefined,
    created_to: typeof params?.created_to === "string" ? params.created_to : undefined,
    updated_by: typeof params?.updated_by === "string" ? params.updated_by : undefined,
    updated_from: typeof params?.updated_from === "string" ? params.updated_from : undefined,
    updated_to: typeof params?.updated_to === "string" ? params.updated_to : undefined,
  };
  const whereCondition = buildShippingWhereInput(filterParams, false);

  const { shippingMethods: shippingMethodsRaw, totalShippingMethods, dashboardUsers } =
    await getShippingDashboardDataInDB(whereCondition, skipCount, pageSize);

  const shippingMethods = serializeShippingMethods(shippingMethodsRaw);
  const userIds = shippingMethods.flatMap((s) => [s.created_by, s.updated_by]);
  const userNames = await resolveUserNames(userIds);

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <ShippingTable
        shippingMethods={shippingMethods as any}
        dashboardUsers={dashboardUsers}
        filterParams={filterParams}
        permissions={permissions}
        userNames={userNames}
        totalCount={totalShippingMethods}
      />

      <Pagination
        totalItems={totalShippingMethods}
        currentPage={currentPage}
        pageSize={pageSize}
        itemName="shipping methods"
      />
    </div>
  );
}
