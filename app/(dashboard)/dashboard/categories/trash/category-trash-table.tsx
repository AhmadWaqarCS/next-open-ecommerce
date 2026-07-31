"use client";

import {
  bulkPermanentlyDeleteCategories,
  bulkRestoreCategories,
  permanentlyDeleteCategory,
  restoreCategory,
} from "@/actions/category-actions";
import Modal from "@/app/(dashboard)/_components/modal";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { category, CRUD } from "@/lib/types";
import { useState, useTransition } from "react";
import Image from "next/image";
import TrashTable, {
  ColumnDef,
} from "@/app/(dashboard)/_components/trash-table";
import ActivityCell from "@/app/(dashboard)/_components/activity-cell";
import GlobalFilterBar from "@/app/(dashboard)/_components/global-filter-bar";
import { CategoryFilterParams } from "@/lib/filters/category-filters";

interface CategoryTrashTableProps {
  categories: category[];
  dashboardUsers?: { id: number; name: string | null; email: string }[];
  filterParams?: CategoryFilterParams;
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
}

export default function CategoryTrashTable({
  categories,
  dashboardUsers = [],
  filterParams = {},
  permissions,
  userNames,
  totalCount,
}: CategoryTrashTableProps) {
  const [selectedRestoreCategory, setSelectedRestoreCategory] =
    useState<category | null>(null);
  const [selectedDeleteCategory, setSelectedDeleteCategory] =
    useState<category | null>(null);
  const [isRestorePending, startRestoreTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const { toast } = useToast();

  const handleRestoreCategory = (id: number) => {
    startRestoreTransition(async () => {
      const response = await restoreCategory(id);
      if (!response.success) {
        toast(response.message ?? "Failed to restore category", "error");
        return;
      }
      toast(response.message ?? "Category restored successfully", "success");
      setSelectedRestoreCategory(null);
    });
  };

  const handlePermanentlyDeleteCategory = (id: number) => {
    startDeleteTransition(async () => {
      const response = await permanentlyDeleteCategory(id);
      if (!response.success) {
        toast(response.message ?? "Failed to delete category", "error");
        return;
      }
      toast(response.message ?? "Category permanently deleted", "success");
      setSelectedDeleteCategory(null);
    });
  };

  const columns: ColumnDef<category>[] = [
    {
      header: "Name & Cover",
      render: (cat) => (
        <div className="flex items-center gap-3">
          <div
            className={`relative h-10 w-10 rounded-lg overflow-hidden ${
              cat.bg_color?.includes("bg-")
                ? cat.bg_color
                : `bg-gradient-to-br ${
                    cat.bg_color ?? "from-zinc-800 to-zinc-950"
                  }`
            } border border-zinc-200 dark:border-zinc-800 flex-shrink-0 flex items-center justify-center`}
          >
            {cat.image_url ? (
              <Image
                src={cat.image_url}
                alt={cat.name}
                fill
                // unoptimized
                className="object-cover"
              />
            ) : (
              <span className="text-[10px] font-bold text-white uppercase">
                {cat.name.slice(0, 2)}
              </span>
            )}
          </div>
          <div>
            <div className="font-bold text-zinc-900 dark:text-zinc-50">
              {cat.name}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">
              /{cat.slug}
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      <TrashTable
        title="Categories Trash Bin"
        description="Permanently delete or restore soft-deleted product categories."
        backHref="/dashboard/categories"
        backLabel="Back to Categories"
        filterBar={
          <GlobalFilterBar
            searchKey="name"
            searchPlaceholder="Search category name or slug..."
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
                key: "hierarchy",
                label: "Hierarchy",
                type: "select",
                isPrimary: true,
                options: [
                  { label: "Parent Categories", value: "is_parent" },
                  { label: "Subcategories", value: "is_child" },
                  { label: "Has Subcategories", value: "has_children" },
                  { label: "No Subcategories", value: "no_children" },
                ],
              },
              {
                key: "description",
                label: "Description Contains",
                type: "text",
                placeholder: "Search description...",
              },
              {
                key: "has_image",
                label: "Has Image",
                type: "select",
                options: [
                  { label: "Yes", value: "true" },
                  { label: "No", value: "false" },
                ],
              },
              {
                key: "has_meta",
                label: "Has Meta Info",
                type: "select",
                options: [
                  { label: "Yes", value: "true" },
                  { label: "No", value: "false" },
                ],
              },
              {
                key: "bg_color",
                label: "Background Color",
                type: "text",
                placeholder: "e.g. #FF0000",
              },
              {
                key: "min_products",
                label: "Min Products",
                type: "number",
                placeholder: "e.g. 0",
              },
              {
                key: "max_products",
                label: "Max Products",
                type: "number",
                placeholder: "e.g. 100",
              },
            ]}
          />
        }
        permissions={permissions}
        data={categories}
        totalCount={totalCount}
        columns={columns}
        renderActivity={(cat) => (
          <ActivityCell
            deletedBy={cat.deleted_by}
            deletedAt={cat.deleted_at}
            userNames={userNames}
            isTrash={true}
          />
        )}
        renderActions={(cat) => (
          <div className="flex items-center justify-end gap-2">
            {permissions.delete && (
              <button
                onClick={() => setSelectedRestoreCategory(cat)}
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
                onClick={() => setSelectedDeleteCategory(cat)}
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
          bulkRestoreCategories(ids, selectAllScope, filterParams)
        }
        onBulkPermanentlyDelete={(ids, selectAllScope) =>
          bulkPermanentlyDeleteCategories(ids, selectAllScope, filterParams)
        }
        emptyState={{
          title: "No deleted categories found",
          description:
            "No archived categories match your search or filter criteria.",
        }}
      />

      {/* Restore Modal */}
      <Modal
        isOpen={!!selectedRestoreCategory}
        onClose={() => setSelectedRestoreCategory(null)}
      >
        <div className="mb-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Restore Category
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Restore this category back to the active catalog.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Are you sure you want to restore &quot;
            <span className="font-bold text-zinc-800 dark:text-zinc-250">
              {selectedRestoreCategory?.name}
            </span>
            &quot;?
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setSelectedRestoreCategory(null)}
              className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => handleRestoreCategory(selectedRestoreCategory!.id)}
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
        isOpen={!!selectedDeleteCategory}
        onClose={() => setSelectedDeleteCategory(null)}
      >
        <div className="mb-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Permanently Delete Category
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            This action cannot be undone.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Are you sure you want to permanently delete &quot;
            <span className="font-bold text-zinc-800 dark:text-zinc-250">
              {selectedDeleteCategory?.name}
            </span>
            &quot;?
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setSelectedDeleteCategory(null)}
              className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                handlePermanentlyDeleteCategory(selectedDeleteCategory!.id)
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
