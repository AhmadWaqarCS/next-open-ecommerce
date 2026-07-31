"use client";

import { createShippingMethod, updateShippingMethod } from "@/actions/shipping-actions";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { setFormErrors } from "@/lib/client-utils";
import { shipping_method } from "@/lib/generated/prisma/client";
import { ShippingMethodCreateInput, shippingMethodCreateSchema, shippingMethodUpdateSchema } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

interface ShippingFormProps {
  initialData?: shipping_method;
}

export default function ShippingForm({ initialData }: ShippingFormProps) {
  const router = useRouter();
  const isEdit = Boolean(initialData);
  const [isPending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ShippingMethodCreateInput>({
    resolver: zodResolver(isEdit ? shippingMethodUpdateSchema : shippingMethodCreateSchema) as any,
    defaultValues: {
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      price: initialData?.price !== undefined ? Number(initialData.price) : 0,
      free_over: initialData?.free_over !== null && initialData?.free_over !== undefined ? Number(initialData.free_over) : undefined,
      estimated_days_min: initialData?.estimated_days_min ?? undefined,
      estimated_days_max: initialData?.estimated_days_max ?? undefined,
      sort_order: initialData?.sort_order ?? 0,
      is_active: initialData?.is_active ?? true,
    },
  });

  const onSubmit = (data: ShippingMethodCreateInput) => {
    setGlobalError(null);

    startTransition(async () => {
      let res;
      if (isEdit && initialData) {
        res = await updateShippingMethod(initialData.id, data);
      } else {
        res = await createShippingMethod(data);
      }

      if (!res.success) {
        if (res.errors) {
          setFormErrors(res.errors, setError);
        }
        const errorMsg = res.message ?? "An error occurred while saving the shipping method.";
        setGlobalError(errorMsg);
        toast(errorMsg, "error");
        return;
      }

      toast(
        res.message ?? `Shipping method ${isEdit ? "updated" : "created"} successfully.`,
        "success"
      );
      router.push("/dashboard/shipping");
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {globalError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-sm flex items-center gap-3">
          <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{globalError}</span>
        </div>
      )}

      {/* Main Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            Shipping Method Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Standard Shipping, Express Delivery, Overnight"
            {...register("name")}
            className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
          />
          {errors.name && (
            <p className="text-xs text-rose-500 mt-1">{errors.name.message}</p>
          )}
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            Description
          </label>
          <textarea
            rows={3}
            placeholder="e.g. Delivered within 3-5 business days across major cities."
            {...register("description")}
            className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm resize-none"
          />
          {errors.description && (
            <p className="text-xs text-rose-500 mt-1">{errors.description.message}</p>
          )}
        </div>

        {/* Base Price */}
        <div>
          <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            Base Shipping Price ($) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-medium text-sm">
              $
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register("price")}
              className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
            />
          </div>
          {errors.price && (
            <p className="text-xs text-rose-500 mt-1">{errors.price.message}</p>
          )}
        </div>

        {/* Free Shipping Over Threshold */}
        <div>
          <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            Free Shipping Threshold ($)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-medium text-sm">
              $
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 50.00 (Leave empty if none)"
              {...register("free_over")}
              className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
            />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Orders exceeding this total amount get free shipping for this method.
          </p>
          {errors.free_over && (
            <p className="text-xs text-rose-500 mt-1">{errors.free_over.message}</p>
          )}
        </div>

        {/* Min Estimated Days */}
        <div>
          <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            Estimated Delivery Min Days
          </label>
          <input
            type="number"
            min="0"
            placeholder="e.g. 2"
            {...register("estimated_days_min")}
            className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
          />
          {errors.estimated_days_min && (
            <p className="text-xs text-rose-500 mt-1">{errors.estimated_days_min.message}</p>
          )}
        </div>

        {/* Max Estimated Days */}
        <div>
          <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            Estimated Delivery Max Days
          </label>
          <input
            type="number"
            min="0"
            placeholder="e.g. 5"
            {...register("estimated_days_max")}
            className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
          />
          {errors.estimated_days_max && (
            <p className="text-xs text-rose-500 mt-1">{errors.estimated_days_max.message}</p>
          )}
        </div>

        {/* Sort Order */}
        <div>
          <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            Sort Order
          </label>
          <input
            type="number"
            placeholder="0"
            {...register("sort_order")}
            className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Lower numerical values appear first on checkout.
          </p>
          {errors.sort_order && (
            <p className="text-xs text-rose-500 mt-1">{errors.sort_order.message}</p>
          )}
        </div>

        {/* Status Toggle */}
        <div className="flex items-center gap-3 pt-6">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              {...register("is_active")}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-emerald-600"></div>
          </label>
          <div>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 block">
              Active Status
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
              Enable this method to make it selectable by customers at checkout.
            </span>
          </div>
        </div>
      </div>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <Link
          href="/dashboard/shipping"
          className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition-all cursor-pointer"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
        >
          {isPending ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Saving...</span>
            </>
          ) : (
            <span>{isEdit ? "Update Shipping Method" : "Create Shipping Method"}</span>
          )}
        </button>
      </div>
    </form>
  );
}
