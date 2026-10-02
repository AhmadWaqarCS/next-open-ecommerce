"use client";

import {
  bulkPermanentlyDeleteShippingMethods,
  bulkRestoreShippingMethods,
  permanentlyDeleteShippingMethod,
  restoreShippingMethod,
} from "@/actions/shipping-actions";
import { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import TrashTable from "@/app/(dashboard)/_components/trash-table";
import { ShippingFilterParams } from "@/lib/filters/shipping-filters";
import { shipping_method } from "@/lib/generated/prisma/client";
import { CRUD } from "@/lib/types";

interface ShippingTrashTableProps {
  shippingMethods: shipping_method[];
  dashboardUsers?: { id: number; name: string | null; email: string }[];
  filterParams?: ShippingFilterParams;
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
}

export default function ShippingTrashTable({
  shippingMethods,
  dashboardUsers = [],
  filterParams = {},
  permissions,
  userNames,
  totalCount = 0,
  currentPage = 1,
  pageSize = 10,
}: ShippingTrashTableProps) {
  const columns: ColumnDef<shipping_method>[] = [
    {
      header: "Name & Description",
      render: (method) => (
        <div className="flex flex-col gap-0.5 max-w-xs sm:max-w-md">
          <span className="font-bold text-dashboard-fg">
            {method.name}
          </span>
          {method.description && (
            <span className="text-xs text-dashboard-muted font-normal line-clamp-1">
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
          <span className="font-semibold text-dashboard-fg text-sm">
            ${Number(method.price).toFixed(2)}
          </span>
          {method.free_over !== null && method.free_over !== undefined ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-dashboard-accent bg-dashboard-accent-subtle px-2 py-0.5 rounded-md border border-dashboard-border-subtle w-fit">
              Free over ${Number(method.free_over).toFixed(2)}
            </span>
          ) : (
            <span className="text-[11px] text-dashboard-muted font-normal">
              Standard rate only
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
            <span className="text-xs font-medium text-dashboard-fg">
              {method.estimated_days_min}–{method.estimated_days_max} business days
            </span>
          );
        }
        if (method.estimated_days_min !== null) {
          return (
            <span className="text-xs font-medium text-dashboard-fg">
              Min {method.estimated_days_min} business days
            </span>
          );
        }
        if (method.estimated_days_max !== null) {
          return (
            <span className="text-xs font-medium text-dashboard-fg">
              Max {method.estimated_days_max} business days
            </span>
          );
        }
        return <span className="text-xs text-dashboard-muted">—</span>;
      },
    },
    {
      header: "Sort Order",
      render: (method) => (
        <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-mono font-medium rounded-md bg-dashboard-muted-bg text-dashboard-fg border border-dashboard-border">
          {method.sort_order}
        </span>
      ),
    },
  ];

  return (
    <TrashTable<shipping_method>
      title="Shipping Methods Trash Bin"
      description="Restore soft-deleted shipping methods or permanently delete them from the database."
      backHref="/dashboard/shipping"
      backLabel="Back to Shipping Methods"
      permissions={permissions}
      data={shippingMethods}
      columns={columns}
      filterConfig={{
        searchKey: "name",
        searchPlaceholder: "Search trashed methods...",
        users: dashboardUsers,
        customFilters: [
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
        ],
      }}
      paginationConfig={{
        totalItems: totalCount,
        currentPage,
        pageSize,
        itemName: "trashed shipping methods",
      }}
      activityConfig={{ userNames }}
      actionConfig={{
        onRestore: async (method) => {
          return await restoreShippingMethod(method.id);
        },
        onPermanentlyDelete: async (method) => {
          return await permanentlyDeleteShippingMethod(method.id);
        },
        restoreConfirmMessage: (method) =>
          `Are you sure you want to restore shipping method "${method.name}"?`,
        deleteConfirmMessage: (method) =>
          `Are you sure you want to permanently delete "${method.name}"? This action cannot be undone.`,
      }}
      bulkConfig={{
        onBulkRestore: async (ids, selectAllScope) => {
          return await bulkRestoreShippingMethods(ids, selectAllScope, filterParams);
        },
        onBulkPermanentlyDelete: async (ids, selectAllScope) => {
          return await bulkPermanentlyDeleteShippingMethods(ids, selectAllScope, filterParams);
        },
      }}
      emptyState={{
        title: "Trash bin is empty",
        description: "No shipping methods are currently in the trash bin.",
      }}
    />
  );
}
