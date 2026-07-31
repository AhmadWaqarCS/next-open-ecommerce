"use client";

import { bulkDeleteShippingMethods, deleteShippingMethod } from "@/actions/shipping-actions";
import ActivityCell from "@/app/(dashboard)/_components/activity-cell";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import Modal from "@/app/(dashboard)/_components/modal";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { ShippingFilterParams } from "@/lib/filters/shipping-filters";
import { shipping_method } from "@/lib/generated/prisma/client";
import { CRUD } from "@/lib/types";
import Link from "next/link";
import { useState, useTransition } from "react";
import GlobalFilterBar from "@/app/(dashboard)/_components/global-filter-bar";

interface ShippingTableProps {
  shippingMethods: shipping_method[];
  dashboardUsers?: { id: number; name: string | null; email: string }[];
  filterParams?: ShippingFilterParams;
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
}

export default function ShippingTable({
  shippingMethods,
  dashboardUsers = [],
  filterParams = {},
  permissions,
  userNames,
  totalCount,
}: ShippingTableProps) {
  const [selectedDeleteMethod, setSelectedDeleteMethod] = useState<shipping_method | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();
  const { toast } = useToast();

  const handleDeleteMethod = (id: number) => {
    startDeleteTransition(async () => {
      const response = await deleteShippingMethod(id);
      if (!response.success) {
        toast(response.message ?? "Failed to delete shipping method", "error");
        return;
      }
      setSelectedDeleteMethod(null);
      toast(response.message ?? "Shipping method moved to trash", "success");
    });
  };

  const columns: ColumnDef<shipping_method>[] = [
    {
      header: "Name & Description",
      render: (method) =>
        permissions.update ? (
          <Link
            href={`/dashboard/shipping/${method.id}/edit`}
            className="group/item flex flex-col gap-0.5 cursor-pointer"
          >
            <span className="font-bold text-zinc-900 dark:text-zinc-50 group-hover/item:text-emerald-600 dark:group-hover/item:text-emerald-400 transition-colors">
              {method.name}
            </span>
            {method.description && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal line-clamp-1">
                {method.description}
              </span>
            )}
          </Link>
        ) : (
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
      header: "Rates & Threshold",
      render: (method) => (
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
            ${Number(method.price).toFixed(2)}
          </span>
          {method.free_over !== null && method.free_over !== undefined ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900/40 w-fit">
              Free over ${Number(method.free_over).toFixed(2)}
            </span>
          ) : (
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-normal">
              No free threshold
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Estimated Delivery",
      render: (method) => {
        if (
          method.estimated_days_min !== null &&
          method.estimated_days_max !== null
        ) {
          return (
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {method.estimated_days_min}–{method.estimated_days_max} business days
            </span>
          );
        }
        if (method.estimated_days_min !== null) {
          return (
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Min {method.estimated_days_min} business days
            </span>
          );
        }
        if (method.estimated_days_max !== null) {
          return (
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Max {method.estimated_days_max} business days
            </span>
          );
        }
        return <span className="text-xs text-zinc-400 dark:text-zinc-500">—</span>;
      },
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
    {
      header: "Sort Order",
      render: (method) => (
        <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-mono font-medium rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
          {method.sort_order}
        </span>
      ),
    },
  ];

  const handleBulkDelete = async (selectedIds: number[], selectAllScope: boolean) => {
    return await bulkDeleteShippingMethods(selectedIds, selectAllScope, filterParams);
  };

  return (
    <>
      <DataTable
        title="Shipping Methods"
        description="Manage checkout delivery options, pricing tiers, and delivery estimates."
        viewTrashHref="/dashboard/shipping/trash"
        createButton={
          permissions.create ? (
            <Link
              href="/dashboard/shipping/create"
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-xs transition-all cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Shipping Method</span>
            </Link>
          ) : undefined
        }
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
            createdAt={method.created_at}
            createdBy={method.created_by}
            updatedAt={method.updated_at}
            updatedBy={method.updated_by}
            userNames={userNames}
          />
        )}
        renderActions={(method) => (
          <div className="flex items-center justify-end gap-2">
            {permissions.update && (
              <Link
                href={`/dashboard/shipping/${method.id}/edit`}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Edit Shipping Method"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </Link>
            )}

            {permissions.delete && (
              <button
                onClick={() => setSelectedDeleteMethod(method)}
                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title="Move to Trash"
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
            )}
          </div>
        )}
        onBulkDelete={handleBulkDelete}
        emptyState={{
          title: "No shipping methods found",
          description: "Get started by adding your store's first shipping method.",
          action: permissions.create ? (
            <Link
              href="/dashboard/shipping/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Shipping Method</span>
            </Link>
          ) : undefined,
        }}
      />

      {/* Delete Confirmation Modal */}
      {selectedDeleteMethod && (
        <Modal
          isOpen={Boolean(selectedDeleteMethod)}
          onClose={() => setSelectedDeleteMethod(null)}
        >
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Move Shipping Method to Trash
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Are you sure you want to move &quot;
              <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">
                {selectedDeleteMethod.name}
              </strong>
              &quot; to trash? You can restore it later from the trash page.
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
                onClick={() => handleDeleteMethod(selectedDeleteMethod.id)}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDeletePending ? "Moving to Trash..." : "Move to Trash"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
