"use client";

import {
  bulkPermanentlyDeleteCoupons,
  bulkRestoreCoupons,
  permanentlyDeleteCoupon,
  restoreCoupon,
} from "@/actions/coupon-actions";
import Modal from "@/app/(dashboard)/_components/modal";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { coupon, CRUD } from "@/lib/types";
import { useState, useTransition } from "react";
import TrashTable, { ColumnDef } from "@/app/(dashboard)/_components/trash-table";
import ActivityCell from "@/app/(dashboard)/_components/activity-cell";
import GlobalFilterBar from "@/app/(dashboard)/_components/global-filter-bar";
import { CouponFilterParams } from "@/lib/filters/coupon-filters";

interface CouponTrashTableProps {
  coupons: coupon[];
  dashboardUsers?: { id: number; name: string | null; email: string }[];
  filterParams?: CouponFilterParams;
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
}

export default function CouponTrashTable({
  coupons,
  dashboardUsers = [],
  filterParams = {},
  permissions,
  userNames,
  totalCount,
}: CouponTrashTableProps) {
  const [selectedRestoreCoupon, setSelectedRestoreCoupon] =
    useState<coupon | null>(null);
  const [selectedDeleteCoupon, setSelectedDeleteCoupon] =
    useState<coupon | null>(null);
  const [isRestorePending, startRestoreTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const { toast } = useToast();

  const handleRestoreCoupon = (id: number) => {
    startRestoreTransition(async () => {
      const response = await restoreCoupon(id);
      if (!response.success) {
        toast(response.message ?? "Failed to restore coupon", "error");
        return;
      }
      toast(response.message ?? "Coupon restored successfully", "success");
      setSelectedRestoreCoupon(null);
    });
  };

  const handlePermanentlyDeleteCoupon = (id: number) => {
    startDeleteTransition(async () => {
      const response = await permanentlyDeleteCoupon(id);
      if (!response.success) {
        toast(response.message ?? "Failed to delete coupon", "error");
        return;
      }
      toast(response.message ?? "Coupon permanently deleted", "success");
      setSelectedDeleteCoupon(null);
    });
  };

  const columns: ColumnDef<coupon>[] = [
    {
      header: "Code",
      render: (c) => (
        <span className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono font-extrabold text-xs tracking-wider border border-zinc-200 dark:border-zinc-700">
          {c.code}
        </span>
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
      <TrashTable
        title="Coupons Trash Bin"
        description="Permanently delete or restore soft-deleted discount coupons."
        backHref="/dashboard/coupons"
        backLabel="Back to Coupons"
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
            ]}
          />
        }
        permissions={permissions}
        data={coupons}
        totalCount={totalCount}
        columns={columns}
        renderActivity={(c) => (
          <ActivityCell
            deletedBy={c.deleted_by}
            deletedAt={c.deleted_at}
            userNames={userNames}
            isTrash={true}
          />
        )}
        renderActions={(c) => (
          <div className="flex items-center justify-end gap-2">
            {permissions.delete && (
              <button
                onClick={() => setSelectedRestoreCoupon(c)}
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
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                  />
                </svg>
                <span>Restore</span>
              </button>
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
                <span>Delete Permanently</span>
              </button>
            )}
          </div>
        )}
        onBulkRestore={(ids, selectAllScope) =>
          bulkRestoreCoupons(ids, selectAllScope, filterParams)
        }
        onBulkPermanentlyDelete={(ids, selectAllScope) =>
          bulkPermanentlyDeleteCoupons(ids, selectAllScope, filterParams)
        }
        emptyState={{
          title: "No deleted coupons found",
          description: "No archived coupons match your search or filter criteria.",
        }}
      />

      {/* Restore Modal */}
      <Modal
        isOpen={!!selectedRestoreCoupon}
        onClose={() => setSelectedRestoreCoupon(null)}
      >
        <div className="mb-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Restore Coupon
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Restore this coupon back to active coupons list.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Are you sure you want to restore &quot;
            <span className="font-mono font-bold text-zinc-800 dark:text-zinc-250">
              {selectedRestoreCoupon?.code}
            </span>
            &quot;?
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setSelectedRestoreCoupon(null)}
              className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => handleRestoreCoupon(selectedRestoreCoupon!.id)}
              disabled={isRestorePending}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/10 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isRestorePending ? "Restoring..." : "Yes, Restore"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Permanent Delete Modal */}
      <Modal
        isOpen={!!selectedDeleteCoupon}
        onClose={() => setSelectedDeleteCoupon(null)}
      >
        <div className="mb-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Permanently Delete Coupon
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            This action cannot be undone.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Are you sure you want to permanently delete &quot;
            <span className="font-mono font-bold text-zinc-800 dark:text-zinc-250">
              {selectedDeleteCoupon?.code}
            </span>
            &quot;?
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
              onClick={() =>
                handlePermanentlyDeleteCoupon(selectedDeleteCoupon!.id)
              }
              disabled={isDeletePending}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/10 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isDeletePending ? "Deleting..." : "Yes, Delete Permanently"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
