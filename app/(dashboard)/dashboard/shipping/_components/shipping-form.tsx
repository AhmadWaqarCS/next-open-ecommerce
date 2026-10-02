"use client";

import {
  createShippingMethod,
  updateShippingMethod,
} from "@/actions/shipping-actions";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { setFormErrors } from "@/lib/client-utils";
import { shipping_method } from "@/lib/generated/prisma/client";
import {
  ShippingMethodCreateInput,
  shippingMethodCreateSchema,
  shippingMethodUpdateSchema,
} from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, FieldErrors } from "react-hook-form";

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
    resolver: zodResolver(
      isEdit ? shippingMethodUpdateSchema : shippingMethodCreateSchema,
    ) as any,
    defaultValues: {
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      price:
        initialData?.price !== undefined
          ? Number(initialData.price)
          : 0,
      free_over:
        initialData?.free_over !== null && initialData?.free_over !== undefined
          ? Number(initialData.free_over)
          : undefined,
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
        const errorMsg =
          res.message ?? "An error occurred while saving the shipping method.";
        setGlobalError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      toast.success(
        res.message ??
          `Shipping method ${isEdit ? "updated" : "created"} successfully.`,
      );
      router.push("/dashboard/shipping");
    });
  };

  const onInvalid = (formErrors: FieldErrors<ShippingMethodCreateInput>) => {
    const invalidFields = Object.keys(formErrors).map((fieldName) =>
      fieldName
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
    );

    if (invalidFields.length > 0) {
      setGlobalError(
        `Please correct the following fields: ${invalidFields.join(", ")}`,
      );
    } else {
      setGlobalError("Please fix validation errors in the form.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="bg-dashboard-card border border-dashboard-border rounded-2xl p-6 sm:p-8 shadow-xs space-y-8"
    >
      {/* Top Header: Title, Subtitle & Action Buttons at Top-Right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-dashboard-border">
        <div>
          <h2 className="text-xl font-bold text-dashboard-fg">
            {isEdit
              ? `Edit Shipping Method: ${initialData?.name}`
              : "Create Shipping Method"}
          </h2>
          <p className="text-xs text-dashboard-muted mt-1">
            {isEdit
              ? "Update delivery rates, threshold rules, and estimated delivery timeframe."
              : "Define a new shipping delivery option, pricing tier, and checkout availability."}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/dashboard/shipping"
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-dashboard-border bg-dashboard-card hover:bg-dashboard-card-hover text-dashboard-muted hover:text-dashboard-fg transition-all cursor-pointer"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-fg transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
          >
            {isPending && (
              <svg
                className="animate-spin -ml-1 mr-1 h-4 w-4 text-dashboard-primary-fg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            <span>
              {isEdit ? "Update Shipping Method" : "Save Shipping Method"}
            </span>
          </button>
        </div>
      </div>

      {/* Global Error Notice */}
      {globalError && (
        <div className="p-4 rounded-xl bg-dashboard-danger-subtle border border-dashboard-danger text-dashboard-danger text-sm flex items-center gap-3">
          <svg
            className="h-5 w-5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="font-medium">{globalError}</span>
        </div>
      )}

      {/* Main Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-dashboard-fg mb-1.5">
            Shipping Method Name <span className="text-dashboard-danger">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Standard Delivery, Express Shipping, Overnight Courier"
            {...register("name")}
            className="w-full px-4 py-2.5 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted focus:outline-none focus:border-dashboard-primary transition-all text-sm"
          />
          {errors.name && (
            <p className="text-xs text-dashboard-danger mt-1.5 font-medium">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-dashboard-fg mb-1.5">
            Description
          </label>
          <textarea
            rows={3}
            placeholder="e.g. Delivered directly to your doorstep within 3-5 business days across the country."
            {...register("description")}
            className="w-full px-4 py-2.5 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted focus:outline-none focus:border-dashboard-primary transition-all text-sm resize-none"
          />
          {errors.description && (
            <p className="text-xs text-dashboard-danger mt-1.5 font-medium">
              {errors.description.message}
            </p>
          )}
        </div>

        {/* Base Price */}
        <div>
          <label className="block text-sm font-semibold text-dashboard-fg mb-1.5">
            Base Shipping Price ($) <span className="text-dashboard-danger">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dashboard-muted font-medium text-sm">
              $
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register("price")}
              className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted focus:outline-none focus:border-dashboard-primary transition-all text-sm"
            />
          </div>
          {errors.price && (
            <p className="text-xs text-dashboard-danger mt-1.5 font-medium">
              {errors.price.message}
            </p>
          )}
        </div>

        {/* Free Shipping Over Threshold */}
        <div>
          <label className="block text-sm font-semibold text-dashboard-fg mb-1.5">
            Free Shipping Threshold ($)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dashboard-muted font-medium text-sm">
              $
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 50.00 (leave empty if none)"
              {...register("free_over")}
              className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted focus:outline-none focus:border-dashboard-primary transition-all text-sm"
            />
          </div>
          <p className="text-xs text-dashboard-muted mt-1.5">
            Orders with cart subtotal exceeding this amount receive free shipping.
          </p>
          {errors.free_over && (
            <p className="text-xs text-dashboard-danger mt-1.5 font-medium">
              {errors.free_over.message}
            </p>
          )}
        </div>

        {/* Min Estimated Days */}
        <div>
          <label className="block text-sm font-semibold text-dashboard-fg mb-1.5">
            Estimated Delivery Min Days
          </label>
          <input
            type="number"
            min="0"
            placeholder="e.g. 2"
            {...register("estimated_days_min")}
            className="w-full px-4 py-2.5 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted focus:outline-none focus:border-dashboard-primary transition-all text-sm"
          />
          {errors.estimated_days_min && (
            <p className="text-xs text-dashboard-danger mt-1.5 font-medium">
              {errors.estimated_days_min.message}
            </p>
          )}
        </div>

        {/* Max Estimated Days */}
        <div>
          <label className="block text-sm font-semibold text-dashboard-fg mb-1.5">
            Estimated Delivery Max Days
          </label>
          <input
            type="number"
            min="0"
            placeholder="e.g. 5"
            {...register("estimated_days_max")}
            className="w-full px-4 py-2.5 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted focus:outline-none focus:border-dashboard-primary transition-all text-sm"
          />
          {errors.estimated_days_max && (
            <p className="text-xs text-dashboard-danger mt-1.5 font-medium">
              {errors.estimated_days_max.message}
            </p>
          )}
        </div>

        {/* Sort Order */}
        <div>
          <label className="block text-sm font-semibold text-dashboard-fg mb-1.5">
            Sort Order
          </label>
          <input
            type="number"
            placeholder="0"
            {...register("sort_order")}
            className="w-full px-4 py-2.5 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-dashboard-fg placeholder-dashboard-muted focus:outline-none focus:border-dashboard-primary transition-all text-sm"
          />
          <p className="text-xs text-dashboard-muted mt-1.5">
            Lower numerical values appear first during customer checkout.
          </p>
          {errors.sort_order && (
            <p className="text-xs text-dashboard-danger mt-1.5 font-medium">
              {errors.sort_order.message}
            </p>
          )}
        </div>

        {/* Status Toggle */}
        <div className="flex items-center gap-3 pt-4">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              {...register("is_active")}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-dashboard-muted-bg border border-dashboard-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-dashboard-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-dashboard-primary"></div>
          </label>
          <div>
            <span className="text-sm font-semibold text-dashboard-fg block">
              Active Status
            </span>
            <span className="text-xs text-dashboard-muted block">
              Enable this method to make it selectable by customers at checkout.
            </span>
          </div>
        </div>
      </div>
    </form>
  );
}
