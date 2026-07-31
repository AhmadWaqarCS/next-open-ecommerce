import { serializePaymentMethod } from "@/lib/action-utils";
import { assertPermission } from "@/lib/guards";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import PaymentMethodForm from "../../_components/payment-method-form";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Payment Method",
  description: "Update payment method settings and configuration.",
};

export default async function EditPaymentMethodPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await assertPermission("update", "/dashboard/payment-methods");
  const { id } = await params;
  const methodId = Number(id);

  if (isNaN(methodId) || methodId < 1) {
    notFound();
  }

  const paymentMethodRaw = await prisma.payment_method.findUnique({
    where: { id: methodId, deleted_at: null },
    select: {
      id: true,
      name: true,
      description: true,
      provider: true,
      provider_config: true,
      extra_charge: true,
      instructions: true,
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

  if (!paymentMethodRaw) {
    notFound();
  }

  const paymentMethod = serializePaymentMethod(paymentMethodRaw);

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Edit Payment Method
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Update settings for &quot;{paymentMethod.name}&quot;.
          </p>
        </div>
        <div>
          <Link
            href="/dashboard/payment-methods"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/80 dark:text-zinc-400 transition-all shadow-xs cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Payment Methods</span>
          </Link>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xs">
        <PaymentMethodForm initialData={paymentMethod as any} />
      </div>
    </div>
  );
}
