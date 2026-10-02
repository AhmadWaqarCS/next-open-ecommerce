"use client";

import {
  bulkDeleteShippingMethods,
  bulkSetShippingMethodsStatus,
  deleteShippingMethod,
  toggleShippingMethodStatus,
} from "@/actions/shipping-actions";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import { ShippingFilterParams } from "@/lib/filters/shipping-filters";
import { shipping_method } from "@/lib/generated/prisma/client";
import { CRUD } from "@/lib/types";
import Link from "next/link";

interface ShippingTableProps {
  shippingMethods: shipping_method[];
  dashboardUsers?: { id: number; name: string | null; email: string }[];
  filterParams?: ShippingFilterParams;
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
}

export default function ShippingTable({
  shippingMethods,
  dashboardUsers = [],
  filterParams = {},
  permissions,
  userNames,
  totalCount = 0,
  currentPage = 1,
  pageSize = 10,
}: ShippingTableProps) {
  const columns: ColumnDef<shipping_method>[] = [
    {
      header: "Name & Description",
      render: (method) => (
        <div className="flex flex-col gap-0.5 max-w-xs sm:max-w-md">
          <span className="font-bold text-dashboard-fg group-hover:text-dashboard-primary transition-colors">
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
    <DataTable<shipping_method>
      title="Shipping Methods"
      description="Manage delivery options, pricing tiers, and delivery timeframes for the storefront."
      viewTrashHref="/dashboard/shipping/trash"
      permissions={permissions}
      data={shippingMethods}
      columns={columns}
      getRowHref={
        permissions.update
          ? (method) => `/dashboard/shipping/${method.id}/edit`
          : undefined
      }
      createButton={
        permissions.create ? (
          <Link
            href="/dashboard/shipping/create"
            className="flex items-center gap-2 px-4 py-2 bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-fg rounded-xl text-sm font-semibold shadow-xs transition-all cursor-pointer"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Shipping Method</span>
          </Link>
        ) : undefined
      }
      filterConfig={{
        searchKey: "name",
        searchPlaceholder: "Search method name...",
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
        ],
      }}
      paginationConfig={{
        totalItems: totalCount,
        currentPage,
        pageSize,
        itemName: "shipping methods",
      }}
      statusConfig={{
        statusKey: "is_active",
        onToggleStatus: async (method, newStatus) => {
          return await toggleShippingMethodStatus(method.id, newStatus);
        },
      }}
      activityConfig={{ userNames }}
      actionConfig={{
        editHref: (method) => `/dashboard/shipping/${method.id}/edit`,
        onDelete: async (method) => {
          return await deleteShippingMethod(method.id);
        },
      }}
      bulkConfig={{
        onBulkDelete: async (ids, selectAllScope) => {
          return await bulkDeleteShippingMethods(ids, selectAllScope, filterParams);
        },
        onBulkSetStatus: async (ids, status, selectAllScope) => {
          return await bulkSetShippingMethodsStatus(ids, status, selectAllScope, filterParams);
        },
      }}
      emptyState={{
        title: "No shipping methods found",
        description: "Get started by creating your first shipping delivery option.",
        action: permissions.create ? (
          <Link
            href="/dashboard/shipping/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-fg rounded-xl text-sm font-semibold shadow-xs transition-all cursor-pointer"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Shipping Method</span>
          </Link>
        ) : undefined,
      }}
    />
  );
}
