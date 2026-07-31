import { serializeCoupon } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import CouponForm from "../../_components/coupon-form";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Coupon",
  description: "Edit discount coupon settings",
};

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await assertPermission("update", "/dashboard/coupons");
  const { id } = await params;
  const couponId = Number(id);

  if (isNaN(couponId) || couponId < 1) {
    notFound();
  }

  const rawCouponData = await prisma.coupon.findUnique({
    where: { id: couponId, deleted_at: null },
  });

  if (!rawCouponData) {
    notFound();
  }

  const couponData = serializeCoupon(rawCouponData);

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Edit Coupon
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Update settings, expiration date, and redemption limits for &quot;{couponData.code}&quot;.
          </p>
        </div>
        <div>
          <Link
            href="/dashboard/coupons"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/80 dark:text-zinc-400 transition-all shadow-xs cursor-pointer"
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
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xs">
        <CouponForm initialData={couponData as any} />
      </div>
    </div>
  );
}
