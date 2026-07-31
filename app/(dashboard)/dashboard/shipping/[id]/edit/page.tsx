import { serializeShippingMethod } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import ShippingForm from "../../_components/shipping-form";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Shipping Method",
  description: "Edit shipping method rates and settings",
};

export default async function EditShippingMethodPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await assertPermission("update", "/dashboard/shipping");
  const { id } = await params;
  const shippingId = Number(id);

  if (isNaN(shippingId) || shippingId < 1) {
    notFound();
  }

  const shippingMethodRaw = await prisma.shipping_method.findUnique({
    where: { id: shippingId, deleted_at: null },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      free_over: true,
      estimated_days_min: true,
      estimated_days_max: true,
      is_active: true,
      sort_order: true,
      created_at: true,
      created_by: true,
      updated_at: true,
      updated_by: true,
      deleted_at: true,
      deleted_by: true,
    },
  });

  if (!shippingMethodRaw) {
    notFound();
  }

  const shippingMethod = serializeShippingMethod(shippingMethodRaw);

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Edit Shipping Method
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Update pricing rates, delivery estimation, or active status for &quot;{shippingMethod.name}&quot;.
          </p>
        </div>
        <div>
          <Link
            href="/dashboard/shipping"
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
            <span>Back to Shipping Methods</span>
          </Link>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xs">
        <ShippingForm initialData={shippingMethod as any} />
      </div>
    </div>
  );
}
