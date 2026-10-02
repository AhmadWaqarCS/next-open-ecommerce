import { Suspense } from "react";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";
import { serializeProduct } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductForm from "../../_components/product-form";
import { getProductEditDataInDB } from "@/services/product-services";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Product",
  description: "Edit product details and gallery images",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditProductPage(props: PageProps) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <EditProductPageContent {...props} />
    </Suspense>
  );
}

async function EditProductPageContent({
  params,
}: PageProps) {
  await assertPermission("update", "/dashboard/products");
  const { id } = await params;
  const productId = Number(id);

  if (isNaN(productId) || productId < 1) {
    notFound();
  }

  const editData = await getProductEditDataInDB(productId);

  if (!editData) {
    notFound();
  }

  const { productData, categories } = editData;

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-dashboard-fg tracking-tight">
            Edit Product
          </h1>
          <p className="text-sm text-dashboard-muted">
            Update product details, pricing, and showcase images for &quot;{productData.name}&quot;.
          </p>
        </div>
        <div>
          <Link
            href="/dashboard/products"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl border border-dashboard-border bg-dashboard-card hover:bg-dashboard-card-hover text-dashboard-muted hover:text-dashboard-fg transition-all shadow-xs cursor-pointer"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span>Back to Products</span>
          </Link>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="bg-dashboard-card border border-dashboard-border rounded-2xl p-6 sm:p-8 shadow-xs">
        <ProductForm initialData={serializeProduct(productData) as any} categories={categories} />
      </div>
    </div>
  );
}
