"use client";

import {
  bulkPermanentlyDeleteProducts,
  bulkRestoreProducts,
  permanentlyDeleteProduct,
  restoreProduct,
} from "@/actions/product-actions";
import { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import TrashTable from "@/app/(dashboard)/_components/trash-table";
import { ProductFilterParams } from "@/lib/filters/product-filters";
import { CRUD, product } from "@/lib/types";
import Image from "next/image";

interface ProductTrashTableProps {
  products: (product & { category?: { name: string } | null })[];
  categories?: { id: number; name: string }[];
  dashboardUsers?: { id: number; name: string | null; email: string }[];
  filterParams?: ProductFilterParams;
  permissions: CRUD;
  userNames?: Record<number, string>;
  totalCount?: number;
}

export default function ProductTrashTable({
  products,
  categories = [],
  dashboardUsers = [],
  filterParams = {},
  permissions,
  userNames = {},
  totalCount,
}: ProductTrashTableProps) {
  const getCategoryName = (
    categoryId: number | null,
    prodCategory?: { name: string } | null,
  ) => {
    if (prodCategory?.name) return prodCategory.name;
    if (!categoryId) return "—";
    return categories.find((c) => c.id === categoryId)?.name ?? "—";
  };

  const columns: ColumnDef<product & { category?: { name: string } | null }>[] = [
    {
      header: "Product",
      render: (prod) => (
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-dashboard-muted-bg border border-dashboard-border shrink-0">
            {prod.feature_image_url ? (
              <Image
                src={prod.feature_image_url}
                alt={prod.feature_image_alt_text || prod.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-dashboard-muted">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}
          </div>
          <div>
            <span className="font-bold text-dashboard-fg block">
              {prod.name}
            </span>
            <span className="text-xs text-dashboard-muted font-mono">
              /{prod.slug}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "SKU",
      render: (prod) => (
        <span className="font-mono text-xs text-dashboard-muted">
          {prod.sku || "—"}
        </span>
      ),
    },
    {
      header: "Price",
      render: (prod) => (
        <span className="font-mono font-semibold text-dashboard-fg">
          ${parseFloat(prod.price).toFixed(2)}
        </span>
      ),
    },
    {
      header: "Status",
      render: (prod) => (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
            prod.is_active
              ? "bg-dashboard-accent-subtle text-dashboard-accent-fg"
              : "bg-dashboard-muted-bg text-dashboard-muted"
          }`}
        >
          {prod.is_active ? "Active" : "Draft"}
        </span>
      ),
    },
    {
      header: "Category",
      render: (prod) => (
        <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-dashboard-muted-bg text-dashboard-fg">
          {getCategoryName(prod.category_id, prod.category)}
        </span>
      ),
    },
  ];

  return (
    <TrashTable<product & { category?: { name: string } | null }>
      title="Products Trash Bin"
      description="Permanently delete or restore soft-deleted catalog products."
      backHref="/dashboard/products"
      backLabel="Back to Products"
      permissions={permissions}
      data={products}
      columns={columns}
      filterConfig={{
        searchKey: "name",
        searchPlaceholder: "Search trashed products...",
        users: dashboardUsers,
        customFilters: [
          {
            key: "category_id",
            label: "Category",
            type: "select",
            isPrimary: true,
            options: [
              { label: "Uncategorized", value: "uncategorized" },
              ...categories.map((c) => ({
                label: c.name,
                value: String(c.id),
              })),
            ],
          },
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
            key: "stock_status",
            label: "Stock Status",
            type: "select",
            isPrimary: true,
            options: [
              { label: "In Stock", value: "in_stock" },
              { label: "Out of Stock", value: "out_of_stock" },
            ],
          },
          {
            key: "is_featured",
            label: "Featured",
            type: "select",
            options: [
              { label: "Featured Only", value: "true" },
              { label: "Non-Featured", value: "false" },
            ],
          },
          {
            key: "on_sale",
            label: "On Sale",
            type: "select",
            options: [
              { label: "Yes", value: "true" },
              { label: "No", value: "false" },
            ],
          },
          {
            key: "track_inventory",
            label: "Track Inventory",
            type: "select",
            options: [
              { label: "Yes", value: "true" },
              { label: "No", value: "false" },
            ],
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
            key: "has_variants",
            label: "Has Variants",
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
            key: "description",
            label: "Description Contains",
            type: "text",
            placeholder: "Search description...",
          },
          {
            key: "min_price",
            label: "Min Price",
            type: "number",
            placeholder: "e.g. 10",
          },
          {
            key: "max_price",
            label: "Max Price",
            type: "number",
            placeholder: "e.g. 500",
          },
          {
            key: "min_stock",
            label: "Min Stock Quantity",
            type: "number",
            placeholder: "e.g. 0",
          },
          {
            key: "max_stock",
            label: "Max Stock Quantity",
            type: "number",
            placeholder: "e.g. 100",
          },
        ],
      }}
      paginationConfig={{
        totalItems: totalCount ?? products.length,
        itemName: "trashed products",
      }}
      activityConfig={{ userNames }}
      actionConfig={{
        onRestore: async (prod) => {
          const res = await restoreProduct(prod.id);
          return { success: res.success, message: res.message };
        },
        onPermanentlyDelete: async (prod) => {
          const res = await permanentlyDeleteProduct(prod.id);
          return { success: res.success, message: res.message };
        },
      }}
      bulkConfig={{
        onBulkRestore: async (ids, selectAllScope) => {
          const res = await bulkRestoreProducts(ids, selectAllScope, filterParams);
          return { success: res.success, message: res.message };
        },
        onBulkPermanentlyDelete: async (ids, selectAllScope) => {
          const res = await bulkPermanentlyDeleteProducts(ids, selectAllScope, filterParams);
          return { success: res.success, message: res.message };
        },
      }}
    />
  );
}
