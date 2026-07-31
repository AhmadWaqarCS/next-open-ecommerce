import { resolveUserNames, serializeShippingMethods } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import prisma from "@/lib/prisma";
import Pagination from "@/app/(dashboard)/_components/pagination";
import { ShippingFilterParams, getShippingFilterWhere } from "@/lib/filters/shipping-filters";
import ShippingTrashTable from "./shipping-trash-table";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trash — Shipping Methods",
  description: "Deleted shipping methods",
};

export default async function DashboardShippingTrashPage({
  searchParams,
}: {
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const { permissions } = await assertPermission("delete", "/dashboard/shipping");
  const params = await searchParams;

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

  const where = await getShippingFilterWhere(filterParams, true);

  const [shippingMethodsRaw, totalShippingMethods, dashboardUsers] = await Promise.all([
    prisma.shipping_method.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        free_over: true,
        estimated_days_min: true,
        estimated_days_max: true,
        is_active: true,
        sort_order: true,
        created_at: true,
        created_by: true,
        updated_at: true,
        updated_by: true,
        deleted_at: true,
        deleted_by: true,
      },
      take: pageSize,
      skip: skipCount,
      orderBy: { deleted_at: "desc" },
    }),
    prisma.shipping_method.count({ where }),
    prisma.dashboard_user.findMany({
      where: { deleted_at: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const shippingMethods = serializeShippingMethods(shippingMethodsRaw);
  const userIds = shippingMethods
    .filter((s) => s.deleted_by !== null)
    .map((s) => s.deleted_by as number);
  const userNames = await resolveUserNames(userIds);

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <ShippingTrashTable
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
