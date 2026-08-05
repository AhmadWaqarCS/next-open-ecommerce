"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { site_component } from "@/lib/generated/prisma/client";
import { CRUD } from "@/lib/types";
import {
  deleteSiteComponent,
  bulkSoftDeleteSiteComponents,
} from "@/actions/site-component-actions";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import GlobalFilterBar from "@/app/(dashboard)/_components/global-filter-bar";
import ActivityCell from "@/app/(dashboard)/_components/activity-cell";
import Modal from "@/app/(dashboard)/_components/modal";
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
  const [selectedDeleteComponent, setSelectedDeleteComponent] =
    useState<site_component | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();
  const { toast } = useToast();

  const handleDelete = (id: number) => {
    startDeleteTransition(async () => {
      const res = await deleteSiteComponent(id);
      if (res.success) {
        toast(res.message || "Component moved to trash.", "success");
        setSelectedDeleteComponent(null);
      } else {
        toast(res.message || "Failed to delete component.", "error");
      }
    });
  };

  const handleBulkDelete = async (
    selectedIds: number[],
    selectAllScope: boolean,
  ) => {
    return await bulkSoftDeleteSiteComponents(selectedIds, selectAllScope, false);
  };

  const columns: ColumnDef<site_component>[] = [
    {
      header: "Component Name & Description",
      render: (comp) =>
        permissions.update ? (
          <Link
            href={`/dashboard/site-components/${comp.id}/edit`}
            className="group/item flex flex-col gap-0.5 cursor-pointer"
          >
            <span className="font-bold text-zinc-900 dark:text-zinc-50 group-hover/item:text-emerald-600 dark:group-hover/item:text-emerald-400 transition-colors">
              {comp.name}
            </span>
            {comp.description && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal line-clamp-1">
                {comp.description}
              </span>
            )}
          </Link>
        ) : (
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
      render: (comp) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
            comp.is_active
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900/50"
              : "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
          }`}
        >
          {comp.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];

  return (
    <>
      <DataTable
        title="Site Components Catalog"
        description="System & registered layout UI sections available for dynamic storefront pages."
        viewTrashHref="/dashboard/site-components/trash"
        createButton={
          permissions.create ? (
            <Link
              href="/dashboard/site-components/create"
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-xs transition-all cursor-pointer"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Add Component</span>
            </Link>
          ) : undefined
        }
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
        renderActions={(comp) => (
          <div className="flex items-center justify-end gap-2">
            {permissions.update && (
              <Link
                href={`/dashboard/site-components/${comp.id}/edit`}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Edit Component"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
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
                onClick={() => setSelectedDeleteComponent(comp)}
                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title="Move to Trash"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
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
          title: "No site components found",
          description:
            "Register your store's first dynamic UI component section.",
          action: permissions.create ? (
            <Link
              href="/dashboard/site-components/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Add Component</span>
            </Link>
          ) : undefined,
        }}
      />

      {/* Delete Confirmation Modal */}
      {selectedDeleteComponent && (
        <Modal
          isOpen={Boolean(selectedDeleteComponent)}
          onClose={() => setSelectedDeleteComponent(null)}
        >
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Move Component to Trash
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Are you sure you want to move &quot;
              <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">
                {selectedDeleteComponent.name}
              </strong>
              &quot; to trash? You can restore it later from the trash page.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDeleteComponent(null)}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletePending}
                onClick={() => handleDelete(selectedDeleteComponent.id)}
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
