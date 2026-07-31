"use client";

import {
  bulkDeleteCategories,
  deleteCategory,
} from "@/actions/category-actions";
import { category, CRUD } from "@/lib/types";
import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import Modal from "@/app/(dashboard)/_components/modal";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import ActivityCell from "@/app/(dashboard)/_components/activity-cell";
import GlobalFilterBar from "@/app/(dashboard)/_components/global-filter-bar";
import { CategoryFilterParams } from "@/lib/filters/category-filters";

type CategoryWithCounts = category & {
  _count?: {
    products: number;
    children: number;
  };
};

interface CategoryTableProps {
  categories: CategoryWithCounts[];
  parentCategories: { id: number; name: string }[];
  dashboardUsers?: { id: number; name: string | null; email: string }[];
  filterParams?: CategoryFilterParams;
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
}

export default function CategoryTable({
  categories,
  parentCategories,
  dashboardUsers = [],
  filterParams = {},
  permissions,
  userNames,
  totalCount,
}: CategoryTableProps) {
  const [selectedDeleteCategory, setSelectedDeleteCategory] =
    useState<category | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();
  const { toast } = useToast();

  const handleDeleteCategory = (id: number) => {
    startDeleteTransition(async () => {
      const response = await deleteCategory(id);
      if (!response.success) {
        toast(response.message ?? "Failed to delete category", "error");
        return;
      }
      setSelectedDeleteCategory(null);
      toast(response.message ?? "Category deleted successfully", "success");
    });
  };

  const getParentName = (parentId: number | null) => {
    if (!parentId) return "—";
    return parentCategories.find((c) => c.id === parentId)?.name ?? "—";
  };

  const columns: ColumnDef<CategoryWithCounts>[] = [
    {
      header: "Name & Cover",
      render: (cat) =>
        permissions.update ? (
          <Link
            href={`/dashboard/categories/${cat.id}/edit`}
            className="flex items-center gap-3 group/cat cursor-pointer"
          >
            <div
              className={`relative h-10 w-10 rounded-lg overflow-hidden ${
                cat.bg_color?.includes("bg-")
                  ? cat.bg_color
                  : `bg-gradient-to-br ${
                      cat.bg_color ?? "from-zinc-800 to-zinc-950"
                    }`
              } border border-zinc-200 dark:border-zinc-800 flex-shrink-0 flex items-center justify-center group-hover/cat:border-emerald-500 transition-all`}
            >
              {cat.image_url ? (
                <Image
                  src={cat.image_url}
                  alt={cat.name}
                  fill
                  // unoptimized
                  className="object-cover group-hover/cat:scale-105 transition-transform"
                />
              ) : (
                <span className="text-[10px] font-bold text-white uppercase">
                  {cat.name.slice(0, 2)}
                </span>
              )}
            </div>
            <div>
              <div className="font-bold text-zinc-900 dark:text-zinc-50 group-hover/cat:text-emerald-600 dark:group-hover/cat:text-emerald-400 transition-colors">
                {cat.name}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">
                /{cat.slug}
              </div>
            </div>
          </Link>
        ) : (
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
    {
      header: "Parent Category",
      render: (cat) => (
        <div className="flex flex-col">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {getParentName(cat.parent_id)}
          </span>
          {cat._count?.children ? (
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              {cat._count.children} subcategor
              {cat._count.children === 1 ? "y" : "ies"}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      header: "Products",
      render: (cat) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
          {cat._count?.products ?? 0} item
          {(cat._count?.products ?? 0) === 1 ? "" : "s"}
        </span>
      ),
    },
    {
      header: "Sort Order",
      render: (cat) => (
        <span className="font-bold text-zinc-650 dark:text-zinc-450">
          {cat.sort_order}
        </span>
      ),
    },
    {
      header: "Status",
      render: (cat) =>
        cat.is_active ? (
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
        title="Categories Management"
        description="Organize product collections, set hierarchy levels, and configure SEO visuals."
        viewTrashHref="/dashboard/categories/trash"
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
        createButton={
          permissions.create ? (
            <Link
              href="/dashboard/categories/create"
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
              <span>Add Category</span>
            </Link>
          ) : undefined
        }
        permissions={permissions}
        data={categories}
        totalCount={totalCount}
        columns={columns}
        renderActivity={(cat) => (
          <ActivityCell
            createdBy={cat.created_by}
            updatedBy={cat.updated_by}
            createdAt={cat.created_at}
            updatedAt={cat.updated_at}
            userNames={userNames}
          />
        )}
        renderActions={(cat) => (
          <div className="flex items-center justify-end gap-2">
            {permissions.update && (
              <Link
                href={`/dashboard/categories/${cat.id}/edit`}
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
                <span>Delete</span>
              </button>
            )}
          </div>
        )}
        onBulkDelete={(ids, selectAllScope) =>
          bulkDeleteCategories(ids, selectAllScope, filterParams)
        }
        emptyState={{
          title: "No categories found",
          description:
            "No categories match your search or filter criteria. Try adjusting or clearing your filters.",
          action: permissions.create ? (
            <Link
              href="/dashboard/categories/create"
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
              <span>Add Category</span>
            </Link>
          ) : undefined,
        }}
      />

      {/* Delete Modal */}
      <Modal
        isOpen={!!selectedDeleteCategory}
        onClose={() => setSelectedDeleteCategory(null)}
      >
        <div className="mb-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Delete Category
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Confirm soft deleting this category from the storefront.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Are you sure you want to delete &quot;
            <span className="font-bold text-zinc-800 dark:text-zinc-250">
              {selectedDeleteCategory?.name}
            </span>
            &quot;? This will soft delete it and move it to the trash.
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
              onClick={() => handleDeleteCategory(selectedDeleteCategory!.id)}
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
