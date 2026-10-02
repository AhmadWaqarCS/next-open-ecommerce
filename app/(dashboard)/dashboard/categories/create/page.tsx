import { Suspense } from "react";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";
import { assertPermission } from "@/lib/guards";
import Link from "next/link";
import CategoryForm from "../_components/category-form";
import { getParentCategoriesInDB } from "@/services/category-services";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Category",
  description: "Create a new product category",
};

export default function CreateCategoryPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <CreateCategoryPageContent />
    </Suspense>
  );
}

async function CreateCategoryPageContent() {
  await assertPermission("create", "/dashboard/categories");

  const parentCategories = await getParentCategoriesInDB();

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-dashboard-fg tracking-tight">
            Create New Category
          </h1>
          <p className="text-sm text-dashboard-muted">
            Define a new product category, layout hierarchy, and storefront styling.
          </p>
        </div>
        <div>
          <Link
            href="/dashboard/categories"
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
            <span>Back to Categories</span>
          </Link>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="bg-dashboard-card border border-dashboard-border rounded-2xl p-6 sm:p-8 shadow-xs">
        <CategoryForm parentCategories={parentCategories} />
      </div>
    </div>
  );
}
