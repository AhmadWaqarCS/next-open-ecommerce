"use client";

import {
  bulkPermanentlyDeleteShippingMethods,
  bulkRestoreShippingMethods,
  permanentlyDeleteShippingMethod,
  restoreShippingMethod,
} from "@/actions/shipping-actions";
import ActivityCell from "@/app/(dashboard)/_components/activity-cell";
import Modal from "@/app/(dashboard)/_components/modal";

import { useToast } from "@/app/(dashboard)/_components/toast-context";
import TrashTable, { ColumnDef } from "@/app/(dashboard)/_components/trash-table";
import { ShippingFilterParams } from "@/lib/filters/shipping-filters";
import { shipping_method } from "@/lib/generated/prisma/client";
import { CRUD } from "@/lib/types";
import { useState, useTransition } from "react";
import GlobalFilterBar from "@/app/(dashboard)/_components/global-filter-bar";

interface ShippingTrashTableProps {
  shippingMethods: shipping_method[];
  dashboardUsers?: { id: number; name: string | null; email: string }[];
  filterParams?: ShippingFilterParams;
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
}

export default function ShippingTrashTable({
  shippingMethods,
  dashboardUsers = [],
  filterParams = {},
  permissions,
  userNames,
  totalCount,
}: ShippingTrashTableProps) {
  const [selectedRestoreMethod, setSelectedRestoreMethod] = useState<shipping_method | null>(null);
  const [selectedDeleteMethod, setSelectedDeleteMethod] = useState<shipping_method | null>(null);
  const [isRestorePending, startRestoreTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const { toast } = useToast();

  const handleRestoreMethod = (id: number) => {
    startRestoreTransition(async () => {
      const response = await restoreShippingMethod(id);
      if (!response.success) {
        toast(response.message ?? "Failed to restore shipping method", "error");
        return;
      }
      toast(response.message ?? "Shipping method restored successfully", "success");
      setSelectedRestoreMethod(null);
    });
  };

  const handlePermanentlyDeleteMethod = (id: number) => {
    startDeleteTransition(async () => {
      const response = await permanentlyDeleteShippingMethod(id);
      if (!response.success) {
        toast(response.message ?? "Failed to delete shipping method", "error");
        return;
      }
      toast(response.message ?? "Shipping method permanently deleted", "success");
      setSelectedDeleteMethod(null);
    });
  };

  const columns: ColumnDef<shipping_method>[] = [
    {
      header: "Name & Description",
      render: (method) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-zinc-900 dark:text-zinc-50">
            {method.name}
          </span>
          {method.description && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal line-clamp-1">
              {method.description}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Rate & Threshold",
      render: (method) => (
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
            ${Number(method.price).toFixed(2)}
          </span>
          {method.free_over !== null && method.free_over !== undefined ? (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
              Free over ${Number(method.free_over).toFixed(2)}
            </span>
          ) : (
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
              No threshold
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Status",
      render: (method) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
            method.is_active
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900/50"
              : "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
          }`}
        >
          {method.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];

  const handleBulkRestore = async (selectedIds: number[], selectAllScope: boolean) => {
    return await bulkRestoreShippingMethods(selectedIds, selectAllScope, filterParams);
  };

  const handleBulkPermanentlyDelete = async (selectedIds: number[], selectAllScope: boolean) => {
    return await bulkPermanentlyDeleteShippingMethods(selectedIds, selectAllScope, filterParams);
  };

  return (
    <>
      <TrashTable
        title="Shipping Methods Trash"
        description="View, restore, or permanently delete soft-deleted shipping methods."
        backHref="/dashboard/shipping"
        backLabel="Back to Shipping Methods"
        filterBar={
          <GlobalFilterBar
            searchKey="name"
            searchPlaceholder="Search method name..."
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
                key: "has_free_over",
                label: "Free Shipping Threshold",
                type: "select",
                isPrimary: true,
                options: [
                  { label: "Has Free Threshold", value: "true" },
                  { label: "Standard Rates Only", value: "false" },
                ],
              },
              {
                key: "description",
                label: "Description Contains",
                type: "text",
                placeholder: "Search description...",
              },
              {
                key: "min_price",
                label: "Min Shipping Cost",
                type: "number",
                placeholder: "e.g. 0",
              },
              {
                key: "max_price",
                label: "Max Shipping Cost",
                type: "number",
                placeholder: "e.g. 100",
              },
            ]}
          />
        }
        permissions={permissions}
        data={shippingMethods}
        totalCount={totalCount}
        columns={columns}
        renderActivity={(method) => (
          <ActivityCell
            deletedAt={method.deleted_at}
            deletedBy={method.deleted_by}
            userNames={userNames}
          />
        )}
        renderActions={(method) => (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setSelectedRestoreMethod(method)}
              className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
              title="Restore Shipping Method"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>

            <button
              onClick={() => setSelectedDeleteMethod(method)}
              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="Permanently Delete"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        )}
        onBulkRestore={handleBulkRestore}
        onBulkPermanentlyDelete={handleBulkPermanentlyDelete}
        emptyState={{
          title: "Trash is empty",
          description: "There are currently no deleted shipping methods.",
        }}
      />

      {/* Restore Confirmation Modal */}
      {selectedRestoreMethod && (
        <Modal
          isOpen={Boolean(selectedRestoreMethod)}
          onClose={() => setSelectedRestoreMethod(null)}
        >
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Restore Shipping Method
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Are you sure you want to restore &quot;
              <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">
                {selectedRestoreMethod.name}
              </strong>
              &quot;? It will be moved back to the active shipping methods list.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedRestoreMethod(null)}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRestorePending}
                onClick={() => handleRestoreMethod(selectedRestoreMethod.id)}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isRestorePending ? "Restoring..." : "Restore Shipping Method"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {selectedDeleteMethod && (
        <Modal
          isOpen={Boolean(selectedDeleteMethod)}
          onClose={() => setSelectedDeleteMethod(null)}
        >
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Permanently Delete Shipping Method
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Are you sure you want to permanently delete &quot;
              <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">
                {selectedDeleteMethod.name}
              </strong>
              &quot;? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDeleteMethod(null)}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletePending}
                onClick={() => handlePermanentlyDeleteMethod(selectedDeleteMethod.id)}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDeletePending ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
