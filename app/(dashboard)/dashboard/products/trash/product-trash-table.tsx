"use client";

import {
  bulkPermanentlyDeleteProducts,
  bulkRestoreProducts,
  permanentlyDeleteProduct,
  restoreProduct,
} from "@/actions/product-actions";
import Modal from "@/app/(dashboard)/_components/modal";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { CRUD, product } from "@/lib/types";
import { useState, useTransition } from "react";
import Image from "next/image";
import TrashTable, {
  ColumnDef,
} from "@/app/(dashboard)/_components/trash-table";
import ActivityCell from "@/app/(dashboard)/_components/activity-cell";
import GlobalFilterBar from "@/app/(dashboard)/_components/global-filter-bar";
import { ProductFilterParams } from "@/lib/filters/product-filters";

interface ProductTrashTableProps {
  products: product[];
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
  const [selectedRestoreProduct, setSelectedRestoreProduct] =
    useState<product | null>(null);
  const [selectedDeleteProduct, setSelectedDeleteProduct] =
    useState<product | null>(null);
  const [isRestorePending, startRestoreTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const { toast } = useToast();

  const handleRestoreProduct = (id: number) => {
    startRestoreTransition(async () => {
      const response = await restoreProduct(id);
      if (!response.success) {
        toast(response.message ?? "Failed to restore product", "error");
        return;
      }
      toast(response.message ?? "Product restored successfully", "success");
      setSelectedRestoreProduct(null);
    });
  };

  const handlePermanentlyDeleteProduct = (id: number) => {
    startDeleteTransition(async () => {
      const response = await permanentlyDeleteProduct(id);
      if (!response.success) {
        toast(response.message ?? "Failed to delete product", "error");
        return;
      }
      toast(response.message ?? "Product permanently deleted", "success");
      setSelectedDeleteProduct(null);
    });
  };

  const columns: ColumnDef<product>[] = [
    {
      header: "Product",
      render: (prod) => (
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 shrink-0">
            {prod.feature_image_url ? (
              <Image
                src={prod.feature_image_url}
                alt={prod.feature_image_alt_text || prod.name}
                fill
                // unoptimized
                className="object-cover"
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
            <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
              {prod.name}
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              /{prod.slug}
            </span>
          </div>
        </div>
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
        <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
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
      <TrashTable
        title="Products Trash Bin"
        description="Permanently delete or restore soft-deleted catalog products."
        backHref="/dashboard/products"
        backLabel="Back to Products"
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
        permissions={permissions}
        data={products}
        totalCount={totalCount}
        columns={columns}
        renderActivity={(prod) => (
          <ActivityCell
            deletedBy={prod.deleted_by}
            deletedAt={prod.deleted_at}
            userNames={userNames}
            isTrash={true}
          />
        )}
        renderActions={(prod) => (
          <div className="flex items-center justify-end gap-2">
            {permissions.delete && (
              <button
                onClick={() => setSelectedRestoreProduct(prod)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-indigo-200 bg-white hover:bg-indigo-50 hover:text-indigo-750 text-indigo-600 dark:border-indigo-900/30 dark:bg-zinc-900 dark:text-indigo-450 dark:hover:bg-indigo-950/20 transition-colors cursor-pointer"
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 6H16"
                  />
                </svg>
                <span>Restore</span>
              </button>
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
        onBulkRestore={(ids, selectAllScope) =>
          bulkRestoreProducts(ids, selectAllScope, filterParams)
        }
        onBulkPermanentlyDelete={(ids, selectAllScope) =>
          bulkPermanentlyDeleteProducts(ids, selectAllScope, filterParams)
        }
        emptyState={{
          title: "No deleted products found",
          description:
            "No archived products match your search or filter criteria.",
        }}
      />

      {/* Restore Product Modal */}
      <Modal
        isOpen={!!selectedRestoreProduct}
        onClose={() => setSelectedRestoreProduct(null)}
      >
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Restore Product
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Are you sure you want to restore product &quot;
            {selectedRestoreProduct?.name}&quot; back to the active catalog?
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setSelectedRestoreProduct(null)}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => handleRestoreProduct(selectedRestoreProduct!.id)}
              disabled={isRestorePending}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isRestorePending ? "Restoring..." : "Restore Product"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Permanent Delete Modal */}
      <Modal
        isOpen={!!selectedDeleteProduct}
        onClose={() => setSelectedDeleteProduct(null)}
      >
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-red-600 dark:text-red-400">
            Permanently Delete Product
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Are you sure you want to permanently delete product &quot;
            {selectedDeleteProduct?.name}&quot;? This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setSelectedDeleteProduct(null)}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                handlePermanentlyDeleteProduct(selectedDeleteProduct!.id)
              }
              disabled={isDeletePending}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isDeletePending ? "Deleting..." : "Permanently Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
