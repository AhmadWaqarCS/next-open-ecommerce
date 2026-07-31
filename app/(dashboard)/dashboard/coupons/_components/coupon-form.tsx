"use client";

import { createCoupon, updateCoupon } from "@/actions/coupon-actions";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { setFormErrors } from "@/lib/client-utils";
import { coupon } from "@/lib/types";
import {
  CouponCreateInput,
  couponCreateSchema,
  couponUpdateSchema,
} from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, FieldErrors } from "react-hook-form";

interface CouponFormProps {
  initialData?: coupon;
}

function formatDateForInput(date?: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CouponForm({ initialData }: CouponFormProps) {
  const router = useRouter();
  const isEdit = Boolean(initialData);
  const [isPending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const { toast } = useToast();

  const defaultStartsAt = initialData?.starts_at
    ? formatDateForInput(initialData.starts_at)
    : formatDateForInput(new Date());

  const defaultExpiresAt = initialData?.expires_at
    ? formatDateForInput(initialData.expires_at)
    : "";

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<CouponCreateInput>({
    resolver: zodResolver(isEdit ? couponUpdateSchema : couponCreateSchema) as any,
    defaultValues: {
      code: initialData?.code ?? "",
      discount_type: (initialData?.discount_type as any) ?? "percentage",
      discount_value: initialData?.discount_value ? Number(initialData.discount_value) : ("" as any),
      minimum_order_amount: initialData?.minimum_order_amount != null ? Number(initialData.minimum_order_amount) : undefined,
      max_uses: initialData?.max_uses != null ? Number(initialData.max_uses) : undefined,
      max_uses_per_email: initialData?.max_uses_per_email ?? 1,
      starts_at: defaultStartsAt,
      expires_at: defaultExpiresAt,
      is_active: initialData?.is_active ?? true,
    },
  });

  const discountType = watch("discount_type");
  const discountValue = watch("discount_value");
  const codeValue = watch("code");

  const onSubmit = (data: CouponCreateInput) => {
    setGlobalError(null);
    startTransition(async () => {
      let response;
      if (isEdit && initialData) {
        response = await updateCoupon(initialData.id, data);
      } else {
        response = await createCoupon(data);
      }

      if (!response.success) {
        if (response.errors) {
          setFormErrors(response.errors, setError);
          const invalidFields = Object.keys(response.errors).map((fieldName) =>
            fieldName
              .split("_")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ")
          );
          if (invalidFields.length > 0) {
            setGlobalError(`Invalid fields: ${invalidFields.join(", ")}`);
          } else if (response.message) {
            setGlobalError(response.message);
          }
        } else if (response.message) {
          setGlobalError(response.message);
        }
        return;
      }

      toast(
        response.message ?? (isEdit ? "Coupon updated." : "Coupon created."),
        "success"
      );
      router.push("/dashboard/coupons");
    });
  };

  const onInvalid = (formErrors: FieldErrors<any>) => {
    const invalidFields = Object.keys(formErrors).map((fieldName) =>
      fieldName
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    );

    if (invalidFields.length > 0) {
      setGlobalError(`Invalid fields: ${invalidFields.join(", ")}`);
    } else {
      setGlobalError("Please fix validation errors in the form.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
      {globalError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 font-medium"
        >
          {globalError}
        </div>
      )}

      {/* Basic Settings Card */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          General Coupon Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Coupon Code */}
          <div>
            <label htmlFor="code" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Coupon Code <span className="text-red-500">*</span>
            </label>
            <input
              id="code"
              type="text"
              placeholder="e.g. SUMMER20"
              {...register("code")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all text-sm font-mono uppercase"
            />
            {errors.code && (
              <p className="mt-1 text-xs text-red-500 font-medium">{errors.code.message}</p>
            )}
          </div>

          {/* Discount Type */}
          <div>
            <label htmlFor="discount_type" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Discount Type <span className="text-red-500">*</span>
            </label>
            <select
              id="discount_type"
              {...register("discount_type")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all text-sm"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed_amount">Fixed Amount ($)</option>
            </select>
            {errors.discount_type && (
              <p className="mt-1 text-xs text-red-500 font-medium">{errors.discount_type.message}</p>
            )}
          </div>

          {/* Discount Value */}
          <div>
            <label htmlFor="discount_value" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Discount Value <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="discount_value"
                type="number"
                step="0.01"
                min="0.01"
                placeholder={discountType === "percentage" ? "20" : "15.00"}
                {...register("discount_value")}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all text-sm pr-8"
              />
              <span className="absolute right-3 top-2.5 text-xs font-bold text-zinc-400">
                {discountType === "percentage" ? "%" : "$"}
              </span>
            </div>
            {errors.discount_value && (
              <p className="mt-1 text-xs text-red-500 font-medium">{errors.discount_value.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Restrictions & Usage Limits Card */}
      <div className="space-y-4 pt-2">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          Usage Limits &amp; Restrictions
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Minimum Order Amount */}
          <div>
            <label htmlFor="minimum_order_amount" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Minimum Order Amount ($)
            </label>
            <input
              id="minimum_order_amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 50.00 (Optional)"
              {...register("minimum_order_amount")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all text-sm"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Min cart subtotal required to apply coupon.
            </p>
            {errors.minimum_order_amount && (
              <p className="mt-1 text-xs text-red-500 font-medium">{errors.minimum_order_amount.message}</p>
            )}
          </div>

          {/* Max Uses */}
          <div>
            <label htmlFor="max_uses" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Total Usage Limit
            </label>
            <input
              id="max_uses"
              type="number"
              min="1"
              placeholder="Unlimited if empty"
              {...register("max_uses")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all text-sm"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Maximum times coupon can be redeemed overall.
            </p>
            {errors.max_uses && (
              <p className="mt-1 text-xs text-red-500 font-medium">{errors.max_uses.message}</p>
            )}
          </div>

          {/* Max Uses Per Email */}
          <div>
            <label htmlFor="max_uses_per_email" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Per-Customer Email Limit
            </label>
            <input
              id="max_uses_per_email"
              type="number"
              min="1"
              placeholder="1"
              {...register("max_uses_per_email")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all text-sm"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Maximum redemptions allowed per customer email address.
            </p>
            {errors.max_uses_per_email && (
              <p className="mt-1 text-xs text-red-500 font-medium">{errors.max_uses_per_email.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Validity Schedule Card */}
      <div className="space-y-4 pt-2">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          Schedule &amp; Availability
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Starts At */}
          <div>
            <label htmlFor="starts_at" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Start Date &amp; Time
            </label>
            <input
              id="starts_at"
              type="datetime-local"
              {...register("starts_at")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all text-sm"
            />
            {errors.starts_at && (
              <p className="mt-1 text-xs text-red-500 font-medium">{errors.starts_at.message}</p>
            )}
          </div>

          {/* Expires At */}
          <div>
            <label htmlFor="expires_at" className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Expiration Date &amp; Time (Optional)
            </label>
            <input
              id="expires_at"
              type="datetime-local"
              {...register("expires_at")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all text-sm"
            />
            {errors.expires_at && (
              <p className="mt-1 text-xs text-red-500 font-medium">{errors.expires_at.message}</p>
            )}
          </div>
        </div>

        {/* Active Toggle */}
        <div className="pt-2">
          <label className="inline-flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register("is_active")}
              className="w-4 h-4 rounded-sm text-emerald-600 border-zinc-300 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
            />
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Coupon Active (Can be applied at checkout)
            </span>
          </label>
        </div>
      </div>

      {/* Live Badge Preview Card */}
      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div>
          <span className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-bold block mb-1">
            Coupon Summary Preview
          </span>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono font-bold text-sm uppercase">
              {codeValue || "COUPONCODE"}
            </span>
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {discountValue
                ? discountType === "percentage"
                  ? `${discountValue}% OFF`
                  : `$${Number(discountValue).toFixed(2)} OFF`
                : "Discount Amount"}
            </span>
          </div>
        </div>
      </div>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <Link
          href="/dashboard/coupons"
          className="px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
        >
          {isPending && (
            <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          <span>{isPending ? "Saving..." : isEdit ? "Update Coupon" : "Create Coupon"}</span>
        </button>
      </div>
    </form>
  );
}
