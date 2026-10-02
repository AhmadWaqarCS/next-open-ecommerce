"use client";

import { updatePaymentMethodAction } from "@/actions/payment-method-actions";
import Modal from "@/app/(dashboard)/_components/modal";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { setFormErrors } from "@/lib/client-utils";
import {
  PaymentMethodUpdateInput,
  paymentMethodUpdateSchema,
} from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

export interface SerializedPaymentMethod {
  id: number;
  name: string;
  description: string | null;
  provider: string;
  provider_config: any;
  extra_charge: string | number | null;
  instructions: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string | Date;
  created_by: number;
  updated_at: string | Date;
  updated_by: number;
}

export const PROVIDER_LABELS: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  cash_on_delivery: {
    label: "Cash on Delivery",
    icon: "💵",
    color:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900/50",
  },
  stripe: {
    label: "Stripe",
    icon: "💳",
    color:
      "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-900/50",
  },
  paypal: {
    label: "PayPal",
    icon: "🅿️",
    color:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/50",
  },
  square: {
    label: "Square",
    icon: "⬛",
    color:
      "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
  },
  razorpay: {
    label: "Razorpay",
    icon: "⚡",
    color:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900/50",
  },
};

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: SerializedPaymentMethod | null;
}

export default function PaymentMethodModal({
  isOpen,
  onClose,
  initialData,
}: PaymentMethodModalProps) {
  const [isPending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PaymentMethodUpdateInput>({
    resolver: zodResolver(paymentMethodUpdateSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      extra_charge: null,
      instructions: "",
      sort_order: 0,
      is_active: true,
    },
  });

  const isActive = watch("is_active");

  useEffect(() => {
    if (isOpen && initialData) {
      setGlobalError(null);
      reset({
        name: initialData.name,
        description: initialData.description || "",
        extra_charge:
          initialData.extra_charge != null ? Number(initialData.extra_charge) : null,
        instructions: initialData.instructions || "",
        sort_order: initialData.sort_order ?? 0,
        is_active: initialData.is_active,
      });
    }
  }, [isOpen, initialData, reset]);

  if (!initialData) return null;

  const providerInfo = PROVIDER_LABELS[initialData.provider] ?? {
    label: initialData.provider,
    icon: "💲",
    color:
      "bg-dashboard-muted-bg text-dashboard-fg border-dashboard-border",
  };

  const onSubmit = (values: PaymentMethodUpdateInput) => {
    setGlobalError(null);
    startTransition(async () => {
      const res = await updatePaymentMethodAction(initialData.id, values);
      if (!res.success) {
        if (res.errors) {
          setFormErrors(res.errors, setError);
        }
        if (res.message) {
          setGlobalError(res.message);
          toast.error(res.message);
        }
        return;
      }
      toast.success(res.message ?? "Payment method updated successfully.");
      onClose();
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Header with Save Button on Top Right (CLIENT-SIDE-FORMS.md) */}
        <div className="flex items-start justify-between gap-4 border-b border-dashboard-border pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-dashboard-fg">
                Edit Payment Method
              </h2>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${providerInfo.color}`}
              >
                <span>{providerInfo.icon}</span>
                {providerInfo.label}
              </span>
            </div>
            <p className="text-xs text-dashboard-muted">
              Configure storefront checkout settings for this gateway.
            </p>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-dashboard-primary px-4 py-2 text-sm font-semibold text-dashboard-primary-fg shadow-xs hover:bg-dashboard-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {isPending ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
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
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>

        {/* Global Error Notice */}
        {globalError && (
          <div className="rounded-xl border border-dashboard-danger/30 bg-dashboard-danger-subtle p-3 text-sm text-dashboard-danger flex items-start gap-2">
            <svg
              className="w-5 h-5 shrink-0 mt-0.5"
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
            <span>{globalError}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="space-y-4">
          {/* Method Name */}
          <div>
            <label className="block text-xs font-semibold text-dashboard-fg mb-1">
              Method Name <span className="text-dashboard-danger">*</span>
            </label>
            <input
              type="text"
              {...register("name")}
              placeholder="e.g. Cash on Delivery or Credit Card"
              className="w-full rounded-xl border border-dashboard-border bg-dashboard-muted-bg px-3 py-2 text-sm text-dashboard-fg placeholder:text-dashboard-muted focus:border-dashboard-primary focus:outline-none transition-colors"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-dashboard-danger">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-dashboard-fg mb-1">
              Description
            </label>
            <input
              type="text"
              {...register("description")}
              placeholder="Brief description shown to customers at checkout"
              className="w-full rounded-xl border border-dashboard-border bg-dashboard-muted-bg px-3 py-2 text-sm text-dashboard-fg placeholder:text-dashboard-muted focus:border-dashboard-primary focus:outline-none transition-colors"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-dashboard-danger">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Extra Charge & Sort Order Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-dashboard-fg mb-1">
                Extra Charge ($)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm text-dashboard-muted">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("extra_charge")}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-dashboard-border bg-dashboard-muted-bg pl-7 pr-3 py-2 text-sm text-dashboard-fg placeholder:text-dashboard-muted focus:border-dashboard-primary focus:outline-none transition-colors"
                />
              </div>
              <p className="mt-0.5 text-[11px] text-dashboard-muted">
                Optional surcharge fee added to order total.
              </p>
              {errors.extra_charge && (
                <p className="mt-1 text-xs text-dashboard-danger">
                  {errors.extra_charge.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-dashboard-fg mb-1">
                Sort Order
              </label>
              <input
                type="number"
                min="0"
                {...register("sort_order")}
                className="w-full rounded-xl border border-dashboard-border bg-dashboard-muted-bg px-3 py-2 text-sm text-dashboard-fg placeholder:text-dashboard-muted focus:border-dashboard-primary focus:outline-none transition-colors"
              />
              <p className="mt-0.5 text-[11px] text-dashboard-muted">
                Priority order displayed on the checkout page (0 = first).
              </p>
              {errors.sort_order && (
                <p className="mt-1 text-xs text-dashboard-danger">
                  {errors.sort_order.message}
                </p>
              )}
            </div>
          </div>

          {/* Customer Instructions */}
          <div>
            <label className="block text-xs font-semibold text-dashboard-fg mb-1">
              Instructions
            </label>
            <textarea
              rows={3}
              {...register("instructions")}
              placeholder="e.g. Please keep exact change ready upon courier delivery."
              className="w-full rounded-xl border border-dashboard-border bg-dashboard-muted-bg px-3 py-2 text-sm text-dashboard-fg placeholder:text-dashboard-muted focus:border-dashboard-primary focus:outline-none transition-colors resize-y"
            />
            {errors.instructions && (
              <p className="mt-1 text-xs text-dashboard-danger">
                {errors.instructions.message}
              </p>
            )}
          </div>

          {/* Status Toggle Switch */}
          <div className="flex items-center justify-between rounded-xl border border-dashboard-border bg-dashboard-muted-bg p-3">
            <div>
              <span className="block text-xs font-semibold text-dashboard-fg">
                Method Active Status
              </span>
              <span className="text-[11px] text-dashboard-muted">
                When active, customers can select this method at storefront checkout.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setValue("is_active", !isActive, { shouldDirty: true })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isActive ? "bg-dashboard-primary" : "bg-dashboard-border"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
