"use client";

import {
  bulkDeleteProducts,
  deleteProduct,
  toggleProductFeatured,
  toggleProductStatus,
} from "@/actions/product-actions";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import { ProductFilterParams } from "@/lib/filters/product-filters";
import { CRUD, product } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";

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
  const [featuredMap, setFeaturedMap] = useState<Record<number, boolean>>(() => {
    const map: Record<number, boolean> = {};
    for (const p of products) {
      map[p.id] = p.is_featured;
    }
    return map;
  });
  const [, startFeaturedTransition] = useTransition();

  const handleToggleFeatured = (prodId: number, currentFeatured: boolean) => {
    const nextVal = !currentFeatured;
    setFeaturedMap((prev) => ({ ...prev, [prodId]: nextVal }));
    startFeaturedTransition(async () => {
      const res = await toggleProductFeatured(prodId, nextVal);
      if (!res.success) {
        setFeaturedMap((prev) => ({ ...prev, [prodId]: currentFeatured }));
      }
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

  const columns: ColumnDef<product & { category?: { name: string } | null }>[] = [
    {
      header: "Product",
      render: (prod) => (
        <Link
          href={`/dashboard/products/${prod.id}/edit`}
          className="flex items-center gap-3 group/prod cursor-pointer"
        >
          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-dashboard-muted-bg border border-dashboard-border shrink-0">
            {prod.feature_image_url ? (
              <Image
                src={prod.feature_image_url}
                alt={prod.feature_image_alt_text || prod.name}
                fill
                className="object-cover group-hover/prod:scale-105 transition-transform"
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
            <span className="font-bold text-dashboard-fg block group-hover/prod:text-dashboard-primary transition-colors">
              {prod.name}
            </span>
            <span className="text-xs text-dashboard-muted font-mono">
              /{prod.slug}
            </span>
          </div>
        </Link>
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
        <div className="font-mono font-semibold text-dashboard-fg">
          ${parseFloat(prod.price).toFixed(2)}
          {prod.compare_at_price && (
            <span className="block text-xs text-dashboard-muted line-through">
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
                ? "bg-dashboard-danger-subtle text-dashboard-danger"
                : "bg-dashboard-muted-bg text-dashboard-fg"
            }`}
          >
            {prod.stock_quantity}
          </span>
        ) : (
          <span className="text-xs text-dashboard-muted font-mono">∞ Unlimited</span>
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
    {
      header: "Featured",
      render: (prod) => {
        const isFeatured = featuredMap[prod.id] ?? prod.is_featured;
        return (
          <button
            type="button"
            disabled={!permissions.update}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleFeatured(prod.id, isFeatured);
            }}
            title={isFeatured ? "Click to remove from featured" : "Click to mark as featured"}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
              !permissions.update ? "cursor-default" : "cursor-pointer hover:scale-105"
            } ${
              isFeatured
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                : "bg-dashboard-muted-bg text-dashboard-muted hover:text-dashboard-fg"
            }`}
          >
            <svg
              className={`w-3.5 h-3.5 ${isFeatured ? "fill-amber-500 text-amber-500" : "fill-none text-current"}`}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
            <span>{isFeatured ? "Featured" : "Standard"}</span>
          </button>
        );
      },
    },
  ];

  return (
    <DataTable<product & { category?: { name: string } | null }>
      title="Products Management"
      description="Manage product catalog, pricing, inventory levels, and showcase media."
      permissions={permissions}
      data={products}
      columns={columns}
      viewTrashHref="/dashboard/products/trash"
      createButton={
        permissions.create ? (
          <Link
            href="/dashboard/products/create"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-dashboard-primary text-dashboard-primary-fg hover:bg-dashboard-primary-hover transition-all shadow-xs cursor-pointer"
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
      filterConfig={{
        searchKey: "name",
        searchPlaceholder: "Search product name, slug, SKU...",
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
        itemName: "products",
      }}
      statusConfig={{
        statusKey: "is_active",
        onToggleStatus: async (item, newStatus) => {
          const res = await toggleProductStatus(item.id, newStatus);
          return { success: res.success, message: res.message };
        },
      }}
      activityConfig={{ userNames }}
      actionConfig={{
        editHref: (prod) => `/dashboard/products/${prod.id}/edit`,
        onDelete: async (prod) => {
          const res = await deleteProduct(prod.id);
          return { success: res.success, message: res.message };
        },
      }}
      bulkConfig={{
        onBulkDelete: async (ids, selectAllScope) => {
          const res = await bulkDeleteProducts(ids, selectAllScope, filterParams);
          return { success: res.success, message: res.message };
        },
      }}
      emptyState={{
        title: "No products in store",
        description:
          "There are currently no products available. Click below to add your first product.",
        action: permissions.create ? (
          <Link
            href="/dashboard/products/create"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-dashboard-primary text-dashboard-primary-fg hover:bg-dashboard-primary-hover transition-all shadow-xs cursor-pointer"
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
  );
}
