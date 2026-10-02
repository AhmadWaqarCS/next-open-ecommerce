"use client";

import {
  bulkPermanentlyDeleteCoupons,
  bulkRestoreCoupons,
  permanentlyDeleteCoupon,
  restoreCoupon,
} from "@/actions/coupon-actions";
import { coupon, CRUD } from "@/lib/types";
import TrashTable from "@/app/(dashboard)/_components/trash-table";
import { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import { CouponFilterParams } from "@/lib/filters/coupon-filters";

interface CouponTrashTableProps {
  coupons: coupon[];
  dashboardUsers?: { id: number; name: string | null; email: string }[];
  filterParams?: CouponFilterParams;
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
}

export default function CouponTrashTable({
  coupons,
  dashboardUsers = [],
  filterParams = {},
  permissions,
  userNames,
  totalCount = 0,
  currentPage = 1,
  pageSize = 10,
}: CouponTrashTableProps) {
  const columns: ColumnDef<coupon>[] = [
    {
      header: "Code",
      render: (c) => (
        <span className="px-2.5 py-1 rounded-lg bg-dashboard-muted-bg text-dashboard-fg font-mono font-extrabold text-xs tracking-wider border border-dashboard-border">
          {c.code}
        </span>
      ),
    },
    {
      header: "Discount",
      render: (c) => (
        <div className="flex flex-col">
          <span className="font-bold text-dashboard-fg text-sm">
            {c.discount_type === "percentage"
              ? `${Number(c.discount_value)}% OFF`
              : `$${Number(c.discount_value).toFixed(2)} OFF`}
          </span>
          <span className="text-[11px] text-dashboard-muted capitalize">
            {c.discount_type.replace("_", " ")}
          </span>
        </div>
      ),
    },
    {
      header: "Min Order",
      render: (c) => (
        <span className="text-xs font-semibold text-dashboard-fg">
          {c.minimum_order_amount != null
            ? `$${Number(c.minimum_order_amount).toFixed(2)}`
            : "No minimum"}
        </span>
      ),
    },
    {
      header: "Status Prior to Trash",
      render: (c) =>
        c.is_active ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-dashboard-accent-subtle text-dashboard-accent-fg border border-dashboard-border">
            Active
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-dashboard-muted-bg text-dashboard-muted border border-dashboard-border">
            Inactive
          </span>
        ),
    },
  ];

  return (
    <TrashTable<coupon>
      title="Coupons Trash Bin"
      description="Permanently delete or restore archived promotional coupons."
      backHref="/dashboard/coupons"
      backLabel="Back to Coupons"
      permissions={permissions}
      data={coupons}
      columns={columns}
      filterConfig={{
        searchKey: "code",
        searchPlaceholder: "Search coupon code...",
        users: dashboardUsers,
        customFilters: [
          {
            key: "is_active",
            label: "Status",
            type: "select",
            isPrimary: true,
            options: [
              { label: "Active Only", value: "true" },
              { label: "Inactive Only", value: "false" },
            ],
          },
          {
            key: "discount_type",
            label: "Discount Type",
            type: "select",
            isPrimary: true,
            options: [
              { label: "Percentage (%)", value: "percentage" },
              { label: "Fixed Amount ($)", value: "fixed_amount" },
            ],
          },
        ],
      }}
      paginationConfig={{
        totalItems: totalCount,
        currentPage,
        pageSize,
        itemName: "trashed coupons",
      }}
      activityConfig={{ userNames }}
      actionConfig={{
        onRestore: async (c) => {
          return await restoreCoupon(c.id);
        },
        onPermanentlyDelete: async (c) => {
          return await permanentlyDeleteCoupon(c.id);
        },
      }}
      bulkConfig={{
        onBulkRestore: async (ids, selectAllScope) => {
          return await bulkRestoreCoupons(ids, selectAllScope, filterParams);
        },
        onBulkPermanentlyDelete: async (ids, selectAllScope) => {
          return await bulkPermanentlyDeleteCoupons(
            ids,
            selectAllScope,
            filterParams,
          );
        },
      }}
      emptyState={{
        title: "No deleted coupons found",
        description: "No archived coupons match your search or filter criteria.",
      }}
    />
  );
}
