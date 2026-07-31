"use client";

import { bulkDeleteProducts, deleteProduct } from "@/actions/product-actions";
import { CRUD, product } from "@/lib/types";
import Link from "next/link";
import Image from "next/image";
import { useState, useTransition } from "react";
import { useToast } from "../../_components/toast-context";
import Modal from "../../_components/modal";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import ActivityCell from "@/app/(dashboard)/_components/activity-cell";

import GlobalFilterBar from "@/app/(dashboard)/_components/global-filter-bar";
import { ProductFilterParams } from "@/lib/filters/product-filters";

interface ProductTableProps {
  products: (product & { category?: { name: string } | null })[];
  categories: { id: number; name: string }[];
  dashboardUsers?: { id: number; name: string | null; email: string }[];
  filterParams?: ProductFilterParams;
  permissions: CRUD;
  userNames?: Record<number, string>;
  totalCount?: number;
}

export default function ProductTable({
  products,
  categories,
  dashboardUsers = [],
  filterParams = {},
  permissions,
  userNames = {},
  totalCount,
}: ProductTableProps) {
  const [selectedDeleteProduct, setSelectedDeleteProduct] =
    useState<product | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();
  const { toast } = useToast();

  const handleDeleteProduct = (id: number) => {
    startDeleteTransition(async () => {
      const response = await deleteProduct(id);
      if (!response.success) {
        toast(response.message ?? "Failed to delete product", "error");
        return;
      }
      setSelectedDeleteProduct(null);
      toast(response.message ?? "Product deleted successfully", "success");
    });
  };

  const getCategoryName = (
    categoryId: number | null,
    prodCategory?: { name: string } | null,
  ) => {
    if (prodCategory?.name) return prodCategory.name;
    if (!categoryId) return "—";
    return categories.find((c) => c.id === categoryId)?.name ?? "—";
  };

  const columns: ColumnDef<product & { category?: { name: string } | null }>[] =
    [
      {
        header: "Product",
        render: (prod) => (
          <Link
            href={`/dashboard/products/${prod.id}/edit`}
            className="flex items-center gap-3 group/prod cursor-pointer"
          >
            <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 shrink-0">
              {prod.feature_image_url ? (
                <Image
                  src={prod.feature_image_url}
                  alt={prod.feature_image_alt_text || prod.name}
                  fill
                  // unoptimized
                  className="object-cover group-hover/prod:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-400">
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
              <span className="font-bold text-zinc-900 dark:text-zinc-100 block group-hover/prod:text-indigo-600 dark:group-hover/prod:text-indigo-400 transition-colors">
                {prod.name}
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                /{prod.slug}
              </span>
            </div>
          </Link>
        ),
      },
      {
        header: "SKU",
        render: (prod) => (
          <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
            {prod.sku || "—"}
          </span>
        ),
      },
      {
        header: "Price",
        render: (prod) => (
          <div className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
            ${parseFloat(prod.price).toFixed(2)}
            {prod.compare_at_price && (
              <span className="block text-xs text-zinc-400 line-through">
                ${parseFloat(prod.compare_at_price).toFixed(2)}
              </span>
            )}
          </div>
        ),
      },
      {
        header: "Stock",
        render: (prod) =>
          prod.track_inventory ? (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                prod.stock_quantity <= prod.low_stock_threshold
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                  : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {prod.stock_quantity} in stock
            </span>
          ) : (
            <span className="text-xs text-zinc-400 font-mono">∞ Unlimited</span>
          ),
      },
      {
        header: "Category",
        render: (prod) => (
          <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            {getCategoryName(prod.category_id, prod.category)}
          </span>
        ),
      },
      {
        header: "Status",
        render: (prod) => (
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
              prod.is_active
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {prod.is_active ? "Active" : "Draft"}
          </span>
        ),
      },
    ];

  return (
    <>
      <DataTable
        title="Products Management"
        description="Manage product catalog, pricing, inventory levels, and showcase media."
        viewTrashHref="/dashboard/products/trash"
        filterBar={
          <GlobalFilterBar
            searchKey="name"
            searchPlaceholder="Search product name, slug, SKU..."
            users={dashboardUsers}
            currentFilters={filterParams as Record<string, string | undefined>}
            customFilters={[
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
            ]}
          />
        }
        createButton={
          permissions.create ? (
            <Link
              href="/dashboard/products/create"
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xs cursor-pointer"
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
              <span>Add Product</span>
            </Link>
          ) : undefined
        }
        permissions={permissions}
        data={products}
        totalCount={totalCount}
        columns={columns}
        renderActivity={(prod) => (
          <ActivityCell
            createdBy={prod.created_by}
            updatedBy={prod.updated_by}
            createdAt={prod.created_at}
            updatedAt={prod.updated_at}
            userNames={userNames}
          />
        )}
        renderActions={(prod) => (
          <div className="flex items-center justify-end gap-2">
            {permissions.update && (
              <Link
                href={`/dashboard/products/${prod.id}/edit`}
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
                onClick={() => setSelectedDeleteProduct(prod)}
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
          bulkDeleteProducts(ids, selectAllScope, filterParams)
        }
        emptyState={{
          title: "No products in store",
          description:
            "There are currently no products available. Click below to add your first product.",
          action: permissions.create ? (
            <Link
              href="/dashboard/products/create"
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xs cursor-pointer"
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
              <span>Add Product</span>
            </Link>
          ) : undefined,
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!selectedDeleteProduct}
        onClose={() => setSelectedDeleteProduct(null)}
      >
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Confirm Delete
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Are you sure you want to move product &quot;
            {selectedDeleteProduct?.name}&quot; to trash?
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setSelectedDeleteProduct(null)}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDeleteProduct(selectedDeleteProduct!.id)}
              disabled={isDeletePending}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isDeletePending ? "Deleting..." : "Move to Trash"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
