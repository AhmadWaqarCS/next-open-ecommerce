"use client";

import {
  bulkDeleteCoupons,
  bulkSetCouponsStatus,
  deleteCoupon,
  toggleCouponStatus,
} from "@/actions/coupon-actions";
import { coupon, CRUD } from "@/lib/types";
import Link from "next/link";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import { CouponFilterParams } from "@/lib/filters/coupon-filters";

type CouponWithCounts = coupon & {
  _count?: {
    orders: number;
  };
};

interface CouponTableProps {
  coupons: CouponWithCounts[];
  dashboardUsers?: { id: number; name: string | null; email: string }[];
  filterParams?: CouponFilterParams;
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
}

export default function CouponTable({
  coupons,
  dashboardUsers = [],
  filterParams = {},
  permissions,
  userNames,
  totalCount = 0,
  currentPage = 1,
  pageSize = 10,
}: CouponTableProps) {
  const formatDate = (date?: Date | string | null) => {
    if (!date) return "No Expiry";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const columns: ColumnDef<CouponWithCounts>[] = [
    {
      header: "Code",
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-dashboard-muted-bg border border-dashboard-border shrink-0 flex items-center justify-center text-dashboard-fg">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
              />
            </svg>
          </div>
          <div>
            <span className="font-mono font-bold text-dashboard-fg block text-sm tracking-wider">
              {c.code}
            </span>
            <span className="text-xs text-dashboard-muted block">
              {c.discount_type === "percentage"
                ? `${Number(c.discount_value)}% OFF`
                : `$${Number(c.discount_value).toFixed(2)} OFF`}
            </span>
          </div>
        </div>
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
      header: "Usage & Limits",
      render: (c) => {
        const isExhausted =
          c.max_uses != null && c.times_used >= c.max_uses;

        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span
                className={`text-xs font-bold ${
                  isExhausted ? "text-dashboard-danger" : "text-dashboard-fg"
                }`}
              >
                {c.times_used} / {c.max_uses ?? "∞"} used
              </span>
              {c._count?.orders ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-dashboard-muted-bg text-dashboard-muted font-medium border border-dashboard-border">
                  {c._count.orders} order{c._count.orders === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>
            <span className="text-[11px] text-dashboard-muted">
              {c.max_uses_per_email} per email
            </span>
          </div>
        );
      },
    },
    {
      header: "Validity",
      render: (c) => (
        <div className="flex flex-col text-xs text-dashboard-muted">
          <span>Starts: {formatDate(c.starts_at)}</span>
          <span>Expires: {formatDate(c.expires_at)}</span>
        </div>
      ),
    },
  ];

  return (
    <DataTable<CouponWithCounts>
      title="Coupons Management"
      description="Create dynamic discount codes, set order value thresholds, configure validity schedules, and track redemptions."
      permissions={permissions}
      data={coupons}
      columns={columns}
      viewTrashHref="/dashboard/coupons/trash"
      createButton={
        permissions.create ? (
          <Link
            href="/dashboard/coupons/create"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-fg transition-all shadow-xs cursor-pointer"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            <span>Add Coupon</span>
          </Link>
        ) : undefined
      }
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
          {
            key: "usage_status",
            label: "Usage Limit",
            type: "select",
            options: [
              { label: "Unlimited Max Uses", value: "unlimited" },
            ],
          },
          {
            key: "min_discount",
            label: "Min Discount Value",
            type: "number",
            placeholder: "e.g. 10",
          },
          {
            key: "max_discount",
            label: "Max Discount Value",
            type: "number",
            placeholder: "e.g. 50",
          },
        ],
      }}
      paginationConfig={{
        totalItems: totalCount,
        currentPage,
        pageSize,
        itemName: "coupons",
      }}
      statusConfig={{
        statusKey: "is_active",
        onToggleStatus: async (item, newStatus) => {
          return await toggleCouponStatus(item.id, newStatus);
        },
      }}
      activityConfig={{ userNames }}
      actionConfig={{
        editHref: (c) => `/dashboard/coupons/${c.id}/edit`,
        onDelete: async (c) => {
          return await deleteCoupon(c.id);
        },
      }}
      bulkConfig={{
        onBulkDelete: async (ids, selectAllScope) => {
          return await bulkDeleteCoupons(ids, selectAllScope, filterParams);
        },
        onBulkSetStatus: async (ids, is_active, selectAllScope) => {
          return await bulkSetCouponsStatus(
            ids,
            is_active,
            selectAllScope,
            filterParams,
          );
        },
      }}
      getRowHref={(c) =>
        permissions.update ? `/dashboard/coupons/${c.id}/edit` : ""
      }
      emptyState={{
        title: "No coupons found",
        description:
          "No coupons match your search or filter criteria. Try adjusting or clearing your filters.",
        action: permissions.create ? (
          <Link
            href="/dashboard/coupons/create"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-fg transition-all shadow-xs cursor-pointer"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            <span>Add Coupon</span>
          </Link>
        ) : undefined,
      }}
    />
  );
}
