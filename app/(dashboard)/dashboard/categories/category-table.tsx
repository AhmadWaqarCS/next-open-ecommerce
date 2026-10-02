"use client";

import {
  bulkDeleteCategories,
  deleteCategory,
  toggleCategoryStatus,
} from "@/actions/category-actions";
import { category, CRUD } from "@/lib/types";
import Link from "next/link";
import Image from "next/image";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
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
  currentPage?: number;
  pageSize?: number;
}

export default function CategoryTable({
  categories,
  parentCategories,
  dashboardUsers = [],
  filterParams = {},
  permissions,
  userNames,
  totalCount = 0,
  currentPage = 1,
  pageSize = 10,
}: CategoryTableProps) {
  const getParentName = (parentId: number | null) => {
    if (!parentId) return "—";
    return parentCategories.find((c) => c.id === parentId)?.name ?? "—";
  };

  const columns: ColumnDef<CategoryWithCounts>[] = [
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
      header: "Parent Category",
      render: (cat) => (
        <div className="flex flex-col">
          <span className="font-medium text-dashboard-fg">
            {getParentName(cat.parent_id)}
          </span>
          {cat._count?.children ? (
            <span className="text-[11px] font-semibold text-dashboard-accent">
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
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-dashboard-muted-bg text-dashboard-fg border border-dashboard-border">
          {cat._count?.products ?? 0} item
          {(cat._count?.products ?? 0) === 1 ? "" : "s"}
        </span>
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
    <DataTable<CategoryWithCounts>
      title="Categories Management"
      description="Organize product collections, configure category hierarchy, and manage storefront visual styles."
      permissions={permissions}
      data={categories}
      columns={columns}
      viewTrashHref="/dashboard/categories/trash"
      createButton={
        permissions.create ? (
          <Link
            href="/dashboard/categories/create"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-fg transition-all shadow-xs cursor-pointer"
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
          {
            key: "bg_color",
            label: "Background Styling",
            type: "text",
            placeholder: "e.g. from-zinc-800",
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
            placeholder: "e.g. 50",
          },
        ],
      }}
      paginationConfig={{
        totalItems: totalCount,
        currentPage,
        pageSize,
        itemName: "categories",
      }}
      statusConfig={{
        statusKey: "is_active",
        onToggleStatus: async (cat, newStatus) => {
          return await toggleCategoryStatus(cat.id, newStatus);
        },
      }}
      activityConfig={{ userNames }}
      actionConfig={{
        editHref: (cat) => `/dashboard/categories/${cat.id}/edit`,
        onDelete: async (cat) => {
          return await deleteCategory(cat.id);
        },
      }}
      bulkConfig={{
        onBulkDelete: async (ids, selectAllScope) => {
          return await bulkDeleteCategories(ids, selectAllScope, filterParams);
        },
      }}
      getRowHref={(cat) =>
        permissions.update ? `/dashboard/categories/${cat.id}/edit` : ""
      }
      emptyState={{
        title: "No categories found",
        description:
          "No categories match your search or filter criteria. Try adjusting or clearing your filters.",
        action: permissions.create ? (
          <Link
            href="/dashboard/categories/create"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-fg transition-all shadow-xs cursor-pointer"
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
  );
}
