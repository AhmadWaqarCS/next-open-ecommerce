"use client";

import { createPaymentMethod, updatePaymentMethod } from "@/actions/payment-method-actions";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { setFormErrors } from "@/lib/client-utils";
import { payment_method } from "@/lib/generated/prisma/client";
import {
  PaymentMethodCreateInput,
  paymentMethodCreateSchema,
  paymentMethodUpdateSchema,
} from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

const PROVIDERS = [
  { value: "cash_on_delivery", label: "Cash on Delivery", icon: "💵", desc: "Customer pays cash upon delivery" },
  { value: "stripe", label: "Stripe", icon: "💳", desc: "Credit/debit cards via Stripe" },
  { value: "paypal", label: "PayPal", icon: "🅿️", desc: "PayPal checkout integration" },
  { value: "square", label: "Square", icon: "⬛", desc: "Square payment processing" },
  { value: "razorpay", label: "Razorpay", icon: "⚡", desc: "Razorpay payments (India)" },
] as const;

interface PaymentMethodFormProps {
  initialData?: payment_method;
}

export default function PaymentMethodForm({ initialData }: PaymentMethodFormProps) {
  const router = useRouter();
  const isEdit = Boolean(initialData);
  const [isPending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<PaymentMethodCreateInput>({
    resolver: zodResolver(
      isEdit ? paymentMethodUpdateSchema : paymentMethodCreateSchema,
    ) as any,
    defaultValues: {
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      provider: (initialData?.provider as any) ?? "cash_on_delivery",
      extra_charge:
        initialData?.extra_charge != null ? Number(initialData.extra_charge) : undefined,
      instructions: initialData?.instructions ?? "",
      sort_order: initialData?.sort_order ?? 0,
      is_active: initialData?.is_active ?? true,
    },
  });

  const selectedProvider = watch("provider");

  const onSubmit = (data: PaymentMethodCreateInput) => {
    setGlobalError(null);
    startTransition(async () => {
      let res;
      if (isEdit && initialData) {
        res = await updatePaymentMethod(initialData.id, data);
      } else {
        res = await createPaymentMethod(data);
      }

      if (!res.success) {
        if (res.errors) setFormErrors(res.errors, setError);
        const errorMsg = res.message ?? "An error occurred while saving the payment method.";
        setGlobalError(errorMsg);
        toast(errorMsg, "error");
        return;
      }

      toast(
        res.message ?? `Payment method ${isEdit ? "updated" : "created"} successfully.`,
        "success",
      );
      router.push("/dashboard/payment-methods");
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            Display Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Cash on Delivery, Credit Card"
            {...register("name")}
            className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm"
          />
          {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name.message}</p>}
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            Description
          </label>
          <textarea
            rows={2}
            placeholder="Brief description shown to the admin team..."
            {...register("description")}
            className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm resize-none"
          />
          {errors.description && <p className="text-xs text-rose-500 mt-1">{errors.description.message}</p>}
        </div>

        {/* Provider */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Provider <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PROVIDERS.map((p) => (
              <label
                key={p.value}
                className={`relative flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedProvider === p.value
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                    : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                }`}
              >
                <input type="radio" value={p.value} {...register("provider")} className="sr-only" />
                <span className="text-2xl leading-none mt-0.5">{p.icon}</span>
                <div className="min-w-0">
                  <span className={`block text-sm font-semibold ${selectedProvider === p.value ? "text-violet-700 dark:text-violet-400" : "text-zinc-900 dark:text-zinc-100"}`}>
                    {p.label}
                  </span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{p.desc}</span>
                </div>
                {selectedProvider === p.value && (
                  <span className="absolute top-2.5 right-2.5 h-4 w-4 rounded-full bg-violet-600 flex items-center justify-center">
                    <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                      <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    </svg>
                  </span>
                )}
              </label>
            ))}
          </div>
          {errors.provider && <p className="text-xs text-rose-500 mt-1">{errors.provider.message}</p>}
        </div>

        {/* Extra Charge */}
        <div>
          <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            Extra Charge ($)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-medium text-sm">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register("extra_charge")}
              className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm"
            />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Optional surcharge added to order total for this payment method (e.g. COD fee).
          </p>
          {errors.extra_charge && <p className="text-xs text-rose-500 mt-1">{errors.extra_charge.message}</p>}
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
            className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Lower values appear first on the checkout page.
          </p>
          {errors.sort_order && <p className="text-xs text-rose-500 mt-1">{errors.sort_order.message}</p>}
        </div>

        {/* Customer Instructions */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            Customer Instructions
          </label>
          <textarea
            rows={3}
            placeholder="e.g. Please have the exact amount ready. Our courier will collect payment on delivery."
            {...register("instructions")}
            className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm resize-none"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Displayed to the customer at checkout when this method is selected.
          </p>
          {errors.instructions && <p className="text-xs text-rose-500 mt-1">{errors.instructions.message}</p>}
        </div>

        {/* Future config notice */}
        {(selectedProvider === "stripe" || selectedProvider === "paypal" || selectedProvider === "square" || selectedProvider === "razorpay") && (
          <div className="md:col-span-2 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
            <svg className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Integration keys required</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                API keys and webhook secrets for <strong>{PROVIDERS.find(p => p.value === selectedProvider)?.label}</strong> must be stored in the{" "}
                <span className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">Secret Vault</span>. This method can be saved as inactive until fully configured.
              </p>
            </div>
          </div>
        )}

        {/* Status Toggle */}
        <div className="flex items-center gap-3 pt-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" {...register("is_active")} className="sr-only peer" />
            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-violet-600"></div>
          </label>
          <div>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 block">Active Status</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
              Enable this method to make it selectable by customers at checkout.
            </span>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <Link
          href="/dashboard/payment-methods"
          className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition-all cursor-pointer"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl bg-violet-600 hover:bg-violet-500 text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
        >
          {isPending ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Saving...</span>
            </>
          ) : (
            <span>{isEdit ? "Update Payment Method" : "Create Payment Method"}</span>
          )}
        </button>
      </div>
    </form>
  );
}
