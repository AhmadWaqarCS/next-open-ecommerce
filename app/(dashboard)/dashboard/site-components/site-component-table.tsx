"use client";

import { useState, useTransition } from "react";
import { site_component } from "@/lib/generated/prisma/client";
import { CRUD } from "@/lib/types";
import { toggleSiteComponentStatus } from "@/actions/site-component-actions";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import GlobalFilterBar from "@/app/(dashboard)/_components/global-filter-bar";
import ActivityCell from "@/app/(dashboard)/_components/activity-cell";
import { SiteComponentFilterParams } from "@/lib/filters/site-component-filters";

interface SiteComponentTableProps {
  components: site_component[];
  dashboardUsers?: { id: number; name: string | null; email: string }[];
  filterParams?: SiteComponentFilterParams;
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
}

export default function SiteComponentTable({
  components,
  dashboardUsers = [],
  filterParams = {},
  permissions,
  userNames,
  totalCount,
}: SiteComponentTableProps) {
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [isTransitionPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleToggleStatus = (id: number, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setPendingId(id);
    startTransition(async () => {
      const res = await toggleSiteComponentStatus(id, newStatus);
      setPendingId(null);
      if (res.success) {
        toast(res.message || `Component ${newStatus ? "enabled" : "disabled"}.`, "success");
      } else {
        toast(res.message || "Failed to update component status.", "error");
      }
    });
  };

  const columns: ColumnDef<site_component>[] = [
    {
      header: "Component Name & Description",
      render: (comp) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-zinc-900 dark:text-zinc-50">
            {comp.name}
          </span>
          {comp.description && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal line-clamp-1">
              {comp.description}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Component Key",
      render: (comp) => (
        <span className="font-mono text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700">
          {comp.component_key}
        </span>
      ),
    },
    {
      header: "Category",
      render: (comp) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50 capitalize">
          {comp.category}
        </span>
      ),
    },
    {
      header: "Status",
      render: (comp) => {
        const isPending = pendingId === comp.id && isTransitionPending;
        return (
          <div className="flex items-center gap-3">
            {permissions.update ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleToggleStatus(comp.id, comp.is_active)}
                className="group flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title={comp.is_active ? "Click to disable component" : "Click to enable component"}
              >
                <span
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    comp.is_active ? "bg-violet-600" : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      comp.is_active ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </span>
                <span
                  className={`text-xs font-semibold ${
                    comp.is_active
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {isPending ? "Updating..." : comp.is_active ? "Active" : "Inactive"}
                </span>
              </button>
            ) : (
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  comp.is_active
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900/50"
                    : "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                }`}
              >
                {comp.is_active ? "Active" : "Inactive"}
              </span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      title="Site Components Catalog"
      description="System & registered layout UI sections available for dynamic storefront pages. Toggle active status to enable or disable components."
      filterBar={
        <GlobalFilterBar
          searchKey="name"
          searchPlaceholder="Search name, key, or description..."
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
              key: "category",
              label: "Category",
              type: "text",
              isPrimary: true,
              placeholder: "e.g. hero, products...",
            },
            {
              key: "component_key",
              label: "Component Key",
              type: "text",
              placeholder: "Exact or partial key...",
            },
          ]}
        />
      }
      permissions={permissions}
      data={components}
      totalCount={totalCount}
      columns={columns}
      renderActivity={(comp) => (
        <ActivityCell
          createdAt={comp.created_at}
          createdBy={comp.created_by}
          updatedAt={comp.updated_at}
          updatedBy={comp.updated_by}
          userNames={userNames}
        />
      )}
      emptyState={{
        title: "No site components found",
        description: "All site components are pre-configured by system seeding.",
      }}
    />
  );
}

