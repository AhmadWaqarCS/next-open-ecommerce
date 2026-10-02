"use client";

import {
  bulkPermanentlyDeleteCategories,
  bulkRestoreCategories,
  permanentlyDeleteCategory,
  restoreCategory,
} from "@/actions/category-actions";
import { category, CRUD } from "@/lib/types";
import Image from "next/image";
import TrashTable from "@/app/(dashboard)/_components/trash-table";
import { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import { CategoryFilterParams } from "@/lib/filters/category-filters";

interface CategoryTrashTableProps {
  categories: category[];
  dashboardUsers?: { id: number; name: string | null; email: string }[];
  filterParams?: CategoryFilterParams;
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
}

export default function CategoryTrashTable({
  categories,
  dashboardUsers = [],
  filterParams = {},
  permissions,
  userNames,
  totalCount = 0,
  currentPage = 1,
  pageSize = 10,
}: CategoryTrashTableProps) {
  const columns: ColumnDef<category>[] = [
    {
      header: "Name & Cover",
      render: (cat) => (
        <div className="flex items-center gap-3">
          <div
            className={`relative h-10 w-10 rounded-lg overflow-hidden ${
              cat.bg_color?.includes("bg-")
                ? cat.bg_color
                : `bg-gradient-to-br ${cat.bg_color ?? "from-zinc-800 to-zinc-950"}`
            } border border-dashboard-border flex-shrink-0 flex items-center justify-center`}
          >
            {cat.image_url ? (
              <Image
                src={cat.image_url}
                alt={cat.name}
                fill
                className="object-cover"
              />
            ) : (
              <span className="text-[10px] font-bold text-white uppercase">
                {cat.name.slice(0, 2)}
              </span>
            )}
          </div>
          <div>
            <div className="font-bold text-dashboard-fg">
              {cat.name}
            </div>
            <div className="text-xs text-dashboard-muted font-normal font-mono">
              /{cat.slug}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Sort Order",
      render: (cat) => (
        <span className="font-semibold text-dashboard-muted font-mono">
          {cat.sort_order}
        </span>
      ),
    },
  ];

  return (
    <TrashTable<category>
      title="Categories Trash Bin"
      description="Permanently delete or restore soft-deleted product categories."
      backHref="/dashboard/categories"
      backLabel="Back to Categories"
      permissions={permissions}
      data={categories}
      columns={columns}
      filterConfig={{
        searchKey: "name",
        searchPlaceholder: "Search category name or slug...",
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
        ],
      }}
      paginationConfig={{
        totalItems: totalCount,
        currentPage,
        pageSize,
        itemName: "trashed categories",
      }}
      activityConfig={{ userNames }}
      actionConfig={{
        onRestore: async (cat) => {
          return await restoreCategory(cat.id);
        },
        onPermanentlyDelete: async (cat) => {
          return await permanentlyDeleteCategory(cat.id);
        },
      }}
      bulkConfig={{
        onBulkRestore: async (ids, selectAllScope) => {
          return await bulkRestoreCategories(ids, selectAllScope, filterParams);
        },
        onBulkPermanentlyDelete: async (ids, selectAllScope) => {
          return await bulkPermanentlyDeleteCategories(ids, selectAllScope, filterParams);
        },
      }}
    />
  );
}
