import { Suspense } from "react";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";
import { assertPermission } from "@/lib/guards";
import Link from "next/link";
import CouponForm from "../_components/coupon-form";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Coupon — Dashboard",
  description: "Create a new discount coupon",
};

export default function CreateCouponPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <CreateCouponPageContent />
    </Suspense>
  );
}

async function CreateCouponPageContent() {
  await assertPermission("create", "/dashboard/coupons");

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-dashboard-fg tracking-tight">
            Create New Coupon
          </h1>
          <p className="text-sm text-dashboard-muted">
            Define promotional discount codes, validity windows, and usage limits.
          </p>
        </div>
        <div>
          <Link
            href="/dashboard/coupons"
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
            <span>Back to Coupons</span>
          </Link>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="bg-dashboard-card border border-dashboard-border rounded-2xl p-6 sm:p-8 shadow-xs">
        <CouponForm />
      </div>
    </div>
  );
}
