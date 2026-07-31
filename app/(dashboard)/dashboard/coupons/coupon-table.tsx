"use client";

import { bulkDeleteCoupons, deleteCoupon } from "@/actions/coupon-actions";
import { coupon, CRUD } from "@/lib/types";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import Modal from "@/app/(dashboard)/_components/modal";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import ActivityCell from "@/app/(dashboard)/_components/activity-cell";
import GlobalFilterBar from "@/app/(dashboard)/_components/global-filter-bar";
import { CouponFilterParams } from "@/lib/filters/coupon-filters";

interface CouponTableProps {
  coupons: coupon[];
  dashboardUsers?: { id: number; name: string | null; email: string }[];
  filterParams?: CouponFilterParams;
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
}

export default function CouponTable({
  coupons,
  dashboardUsers = [],
  filterParams = {},
  permissions,
  userNames,
  totalCount,
}: CouponTableProps) {
  const [selectedDeleteCoupon, setSelectedDeleteCoupon] = useState<coupon | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();
  const { toast } = useToast();

  const handleDeleteCoupon = (id: number) => {
    startDeleteTransition(async () => {
      const response = await deleteCoupon(id);
      if (!response.success) {
        toast(response.message ?? "Failed to delete coupon", "error");
        return;
      }
      setSelectedDeleteCoupon(null);
      toast(response.message ?? "Coupon moved to trash", "success");
    });
  };

  const formatDate = (date?: Date | string | null) => {
    if (!date) return "No Expiry";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const columns: ColumnDef<coupon>[] = [
    {
      header: "Code",
      render: (c) =>
        permissions.update ? (
          <Link
            href={`/dashboard/coupons/${c.id}/edit`}
            className="flex items-center gap-3 group/c cursor-pointer"
          >
            <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/50 shrink-0 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover/c:scale-105 group-hover/c:border-emerald-500 transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <div>
              <span className="font-mono font-extrabold text-zinc-900 dark:text-zinc-100 block group-hover/c:text-emerald-600 dark:group-hover/c:text-emerald-400 transition-colors text-sm">
                {c.code}
              </span>
              <span className="text-xs text-zinc-400 font-medium block">
                {c.discount_type === "percentage"
                  ? `${Number(c.discount_value)}% OFF`
                  : `$${Number(c.discount_value).toFixed(2)} OFF`}
              </span>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/50 shrink-0 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <div>
              <span className="font-mono font-extrabold text-zinc-900 dark:text-zinc-100 block text-sm">
                {c.code}
              </span>
              <span className="text-xs text-zinc-400 font-medium block">
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
          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
            {c.discount_type === "percentage"
              ? `${Number(c.discount_value)}% OFF`
              : `$${Number(c.discount_value).toFixed(2)} OFF`}
          </span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 capitalize">
            {c.discount_type.replace("_", " ")}
          </span>
        </div>
      ),
    },
    {
      header: "Min Order",
      render: (c) => (
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          {c.minimum_order_amount != null
            ? `$${Number(c.minimum_order_amount).toFixed(2)}`
            : "No minimum"}
        </span>
      ),
    },
    {
      header: "Usage / Limit",
      render: (c) => (
        <div className="flex flex-col">
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
            {c.times_used} / {c.max_uses ?? "∞"} used
          </span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {c.max_uses_per_email} per email
          </span>
        </div>
      ),
    },
    {
      header: "Validity",
      render: (c) => (
        <div className="flex flex-col text-xs text-zinc-600 dark:text-zinc-400">
          <span>From: {formatDate(c.starts_at)}</span>
          <span>To: {formatDate(c.expires_at)}</span>
        </div>
      ),
    },
    {
      header: "Status",
      render: (c) =>
        c.is_active ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30">
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-50 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
            Inactive
          </span>
        ),
    },
  ];

  return (
    <>
      <DataTable
        title="Coupons Management"
        description="Create dynamic discount codes, set order value limits, and track redemption metrics."
        viewTrashHref="/dashboard/coupons/trash"
        filterBar={
          <GlobalFilterBar
            searchKey="code"
            searchPlaceholder="Search coupon code..."
            users={dashboardUsers}
            currentFilters={filterParams as Record<string, string | undefined>}
            customFilters={[
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
            ]}
          />
        }
        createButton={
          permissions.create ? (
            <Link
              href="/dashboard/coupons/create"
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm cursor-pointer"
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
        permissions={permissions}
        data={coupons}
        totalCount={totalCount}
        columns={columns}
        renderActivity={(c) => (
          <ActivityCell
            createdBy={c.created_by}
            updatedBy={c.updated_by}
            createdAt={c.created_at}
            updatedAt={c.updated_at}
            userNames={userNames}
          />
        )}
        renderActions={(c) => (
          <div className="flex items-center justify-end gap-2">
            {permissions.update && (
              <Link
                href={`/dashboard/coupons/${c.id}/edit`}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 hover:text-zinc-900 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
                <span>Edit</span>
              </Link>
            )}
            {permissions.delete && (
              <button
                onClick={() => setSelectedDeleteCoupon(c)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-red-200 bg-white hover:bg-red-50 hover:text-red-750 text-red-600 dark:border-red-900/30 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                <span>Delete</span>
              </button>
            )}
          </div>
        )}
        onBulkDelete={(ids, selectAllScope) =>
          bulkDeleteCoupons(ids, selectAllScope, filterParams)
        }
        emptyState={{
          title: "No coupons found",
          description:
            "No coupons match your search or filter criteria. Try adjusting or clearing your filters.",
          action: permissions.create ? (
            <Link
              href="/dashboard/coupons/create"
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm cursor-pointer"
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

      {/* Delete Modal */}
      <Modal
        isOpen={!!selectedDeleteCoupon}
        onClose={() => setSelectedDeleteCoupon(null)}
      >
        <div className="mb-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Delete Coupon
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Confirm soft deleting this coupon code.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Are you sure you want to delete &quot;
            <span className="font-mono font-bold text-zinc-800 dark:text-zinc-250">
              {selectedDeleteCoupon?.code}
            </span>
            &quot;? This will soft delete it and move it to the trash.
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setSelectedDeleteCoupon(null)}
              className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDeleteCoupon(selectedDeleteCoupon!.id)}
              disabled={isDeletePending}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/10 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isDeletePending ? "Deleting..." : "Yes, Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
