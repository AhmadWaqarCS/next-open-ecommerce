import { assertPermission } from "@/lib/guards";
import CouponTable from "./coupon-table";
import { resolveUserNames, serializeCoupons } from "@/lib/action-utils";
import Pagination from "@/app/(dashboard)/_components/pagination";
import { buildCouponWhereInput, CouponFilterParams } from "@/lib/filters/coupon-filters";
import { getCouponsDashboardDataInDB } from "@/services/coupon-services";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coupons",
  description: "Manage discount coupons and promotional offers",
};

export default async function DashboardCouponsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const { permissions } = await assertPermission("read", "/dashboard/coupons");
  const params = (await searchParams) || {};

  const filterParams: CouponFilterParams = {
    id: typeof params.id === "string" ? params.id : undefined,
    code: typeof params.code === "string" ? params.code : undefined,
    discount_type: typeof params.discount_type === "string" ? params.discount_type : undefined,
    is_active: typeof params.is_active === "string" ? params.is_active : undefined,
    min_discount: typeof params.min_discount === "string" ? params.min_discount : undefined,
    max_discount: typeof params.max_discount === "string" ? params.max_discount : undefined,
    created_by: typeof params.created_by === "string" ? params.created_by : undefined,
    created_from: typeof params.created_from === "string" ? params.created_from : undefined,
    created_to: typeof params.created_to === "string" ? params.created_to : undefined,
    updated_by: typeof params.updated_by === "string" ? params.updated_by : undefined,
    updated_from: typeof params.updated_from === "string" ? params.updated_from : undefined,
    updated_to: typeof params.updated_to === "string" ? params.updated_to : undefined,
  };

  const currentPage = Math.max(1, Number(params.page ?? 1));
  const pageSize = Math.max(1, Number(params.size ?? 10));
  const skipCount = (currentPage - 1) * pageSize;

  const whereCondition = buildCouponWhereInput(filterParams, false);

  const { couponsRaw, totalCoupons, dashboardUsers } =
    await getCouponsDashboardDataInDB(whereCondition, skipCount, pageSize);

  const coupons = serializeCoupons(couponsRaw);

  const userIds = coupons.flatMap((c) => [c.created_by, c.updated_by]);
  const userNames = await resolveUserNames(userIds);

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <CouponTable
        coupons={coupons as any}
        dashboardUsers={dashboardUsers}
        filterParams={filterParams}
        permissions={permissions}
        userNames={userNames}
        totalCount={totalCoupons}
      />

      <Pagination
        totalItems={totalCoupons}
        currentPage={currentPage}
        pageSize={pageSize}
        itemName="coupons"
      />
    </div>
  );
}

