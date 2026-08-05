"use client";

import { useState, useTransition } from "react";
import { site_component } from "@/lib/generated/prisma/client";
import { CRUD } from "@/lib/types";
import {
  restoreSiteComponent,
  permanentlyDeleteSiteComponent,
  bulkRestoreSiteComponents,
  bulkPermanentlyDeleteSiteComponents,
} from "@/actions/site-component-actions";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import TrashTable from "@/app/(dashboard)/_components/trash-table";
import { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import GlobalFilterBar from "@/app/(dashboard)/_components/global-filter-bar";
import ActivityCell from "@/app/(dashboard)/_components/activity-cell";
import Modal from "@/app/(dashboard)/_components/modal";
import { SiteComponentFilterParams } from "@/lib/filters/site-component-filters";

interface SiteComponentTrashTableProps {
  components: site_component[];
  dashboardUsers?: { id: number; name: string | null; email: string }[];
  filterParams?: SiteComponentFilterParams;
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
}

export default function SiteComponentTrashTable({
  components,
  dashboardUsers = [],
  filterParams = {},
  permissions,
  userNames,
  totalCount,
}: SiteComponentTrashTableProps) {
  const [selectedPermDelete, setSelectedPermDelete] =
    useState<site_component | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleRestore = (id: number) => {
    startTransition(async () => {
      const res = await restoreSiteComponent(id);
      if (res.success) {
        toast(res.message || "Component restored successfully.", "success");
      } else {
        toast(res.message || "Failed to restore component.", "error");
      }
    });
  };

  const handlePermanentDelete = (id: number) => {
    startTransition(async () => {
      const res = await permanentlyDeleteSiteComponent(id);
      if (res.success) {
        toast(res.message || "Component permanently deleted.", "success");
        setSelectedPermDelete(null);
      } else {
        toast(res.message || "Failed to delete component.", "error");
      }
    });
  };

  const handleBulkRestore = async (
    selectedIds: number[],
    selectAllScope: boolean,
  ) => {
    return await bulkRestoreSiteComponents(selectedIds, selectAllScope, true);
  };

  const handleBulkPermanentlyDelete = async (
    selectedIds: number[],
    selectAllScope: boolean,
  ) => {
    return await bulkPermanentlyDeleteSiteComponents(selectedIds, selectAllScope);
  };

  const columns: ColumnDef<site_component>[] = [
    {
      header: "Component Name & Description",
      render: (comp) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-zinc-900 dark:text-zinc-100">
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
      render: () => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">
          Trashed
        </span>
      ),
    },
  ];

  return (
    <>
      <TrashTable
        title="Trash — Site Components"
        description="View and restore soft-deleted dynamic site UI components."
        backHref="/dashboard/site-components"
        backLabel="Back to Site Components"
        filterBar={
          <GlobalFilterBar
            searchKey="name"
            searchPlaceholder="Search name, key, or description..."
            users={dashboardUsers}
            currentFilters={filterParams as Record<string, string | undefined>}
            customFilters={[
              {
                key: "category",
                label: "Category",
                type: "text",
                isPrimary: true,
                placeholder: "e.g. hero, products...",
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
            deletedAt={comp.deleted_at}
            deletedBy={comp.deleted_by}
            userNames={userNames}
          />
        )}
        renderActions={(comp) => (
          <div className="flex items-center justify-end gap-2">
            {permissions.update && (
              <button
                onClick={() => handleRestore(comp.id)}
                disabled={isPending}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 transition-colors cursor-pointer"
              >
                Restore
              </button>
            )}

            {permissions.delete && (
              <button
                onClick={() => setSelectedPermDelete(comp)}
                disabled={isPending}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-400 transition-colors cursor-pointer"
              >
                Delete Permanently
              </button>
            )}
          </div>
        )}
        onBulkRestore={handleBulkRestore}
        onBulkPermanentlyDelete={handleBulkPermanentlyDelete}
        emptyState={{
          title: "Trash is empty",
          description: "No deleted site components found.",
        }}
      />

      {/* Permanent Delete Modal */}
      {selectedPermDelete && (
        <Modal
          isOpen={Boolean(selectedPermDelete)}
          onClose={() => setSelectedPermDelete(null)}
        >
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Permanently Delete Site Component
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Are you sure you want to permanently delete &quot;
              <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">
                {selectedPermDelete.name}
              </strong>
              &quot;? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPermDelete(null)}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handlePermanentDelete(selectedPermDelete.id)}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isPending ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
