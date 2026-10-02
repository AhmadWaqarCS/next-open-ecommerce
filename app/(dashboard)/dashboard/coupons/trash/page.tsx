import { Suspense } from "react";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";
import { assertPermission } from "@/lib/guards";
import CouponTrashTable from "./coupon-trash-table";
import { resolveUserNames, serializeCoupons } from "@/lib/action-utils";
import {
  buildCouponWhereInput,
  CouponFilterParams,
} from "@/lib/filters/coupon-filters";
import { getCouponTrashDashboardDataInDB } from "@/services/coupon-services";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trash — Coupons",
  description: "Deleted and archived coupons",
};

interface PageProps {
  searchParams?: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}

export default function DashboardCouponsTrashPage(props: PageProps) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardCouponsTrashPageContent {...props} />
    </Suspense>
  );
}

async function DashboardCouponsTrashPageContent({ searchParams }: PageProps) {
  const { permissions } = await assertPermission("delete", "/dashboard/coupons");
  const params = (await searchParams) || {};

  const filterParams: CouponFilterParams = {
    id: typeof params.id === "string" ? params.id : undefined,
    code: typeof params.code === "string" ? params.code : undefined,
    discount_type:
      typeof params.discount_type === "string"
        ? params.discount_type
        : undefined,
    is_active:
      typeof params.is_active === "string" ? params.is_active : undefined,
    min_discount:
      typeof params.min_discount === "string"
        ? params.min_discount
        : undefined,
    max_discount:
      typeof params.max_discount === "string"
        ? params.max_discount
        : undefined,
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
    deleted_by:
      typeof params.deleted_by === "string" ? params.deleted_by : undefined,
    deleted_from:
      typeof params.deleted_from === "string" ? params.deleted_from : undefined,
    deleted_to:
      typeof params.deleted_to === "string" ? params.deleted_to : undefined,
  };

  const currentPage = Math.max(1, Number(params.page ?? 1));
  const pageSize = Math.max(1, Number(params.size ?? 10));
  const skipCount = (currentPage - 1) * pageSize;

  const whereCondition = buildCouponWhereInput(filterParams, true);

  const { couponsRaw, totalCoupons, dashboardUsers } =
    await getCouponTrashDashboardDataInDB(whereCondition, skipCount, pageSize);

  const coupons = serializeCoupons(couponsRaw);

  const userIds = coupons
    .flatMap((c: any) => [c.deleted_by, c.created_by, c.updated_by])
    .filter((id): id is number => typeof id === "number" && id > 0);
  const userNames = await resolveUserNames(userIds);

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <CouponTrashTable
        coupons={coupons as any}
        dashboardUsers={dashboardUsers}
        filterParams={filterParams}
        permissions={permissions}
        userNames={userNames}
        totalCount={totalCoupons}
        currentPage={currentPage}
        pageSize={pageSize}
      />
    </div>
  );
}
