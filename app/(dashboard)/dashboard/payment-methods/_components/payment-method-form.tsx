"use client";

import {
  createPaymentMethod,
  updatePaymentMethod,
  verifyStripeCredentialsAction,
} from "@/actions/payment-method-actions";

// ... inside PaymentMethodForm component ...
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

const STRIPE_ENV_SNIPPET = `# Stripe Payment Gateway Configuration
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_TEST_MODE=true
STRIPE_API_VERSION=2026-07-29.dahlia
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...
NEXT_PUBLIC_SITE_URL=http://localhost:3000`;

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

  const [copiedEnv, setCopiedEnv] = useState(false);
  const [isVerifyingStripe, setIsVerifyingStripe] = useState(false);
  const [stripeVerifyResult, setStripeVerifyResult] = useState<{
    success: boolean;
    message: string;
    details?: {
      accountId?: string;
      businessName?: string;
      livemode?: boolean;
      apiVersion?: string;
      testModeConfigured?: boolean;
    };
  } | null>(null);

  const handleCopyStripeEnv = () => {
    navigator.clipboard.writeText(STRIPE_ENV_SNIPPET);
    setCopiedEnv(true);
    toast("Stripe environment variables snippet copied to clipboard!", "success");
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  const handleVerifyStripe = async () => {
    setIsVerifyingStripe(true);
    setStripeVerifyResult(null);
    try {
      const res = await verifyStripeCredentialsAction();
      setStripeVerifyResult(res);
      if (res.success) {
        toast(res.message, "success");
      } else {
        toast(res.message, "error");
      }
    } catch (err: any) {
      toast(err?.message || "Failed to verify Stripe connection", "error");
    } finally {
      setIsVerifyingStripe(false);
    }
  };

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

        {/* Provider (Static) */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            System Provider
          </label>
          {(() => {
            const providerKey = initialData?.provider ?? "cash_on_delivery";
            const info = PROVIDERS.find((p) => p.value === providerKey) ?? {
              value: providerKey,
              label: providerKey,
              icon: "💳",
              desc: "System provider",
            };
            return (
              <div className="flex items-center gap-3.5 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
                <span className="text-3xl leading-none">{info.icon}</span>
                <div>
                  <span className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {info.label}
                  </span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Provider ID: <code className="font-mono bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded text-zinc-800 dark:text-zinc-200 font-semibold">{providerKey}</code> (Fixed System Provider)
                  </span>
                </div>
              </div>
            );
          })()}
          <input type="hidden" {...register("provider")} />
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

        {/* Stripe Environment Variables & Integration Panel */}
        {selectedProvider === "stripe" && (
          <div className="md:col-span-2 space-y-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <span>💳</span>
                  <span>Stripe Gateway & Environment Configuration</span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  All Stripe API keys and webhook secrets are read securely from server environment variables (<code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-violet-600 dark:text-violet-400">.env</code>).
                </p>
              </div>

              <button
                type="button"
                onClick={handleVerifyStripe}
                disabled={isVerifyingStripe}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-900/40 rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
              >
                {isVerifyingStripe ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Testing Connection...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Verify Stripe Connection</span>
                  </>
                )}
              </button>
            </div>

            {/* Information Card */}
            <div className="p-4 rounded-xl bg-violet-50/60 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/50 flex items-start gap-3">
              <svg className="h-5 w-5 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs text-violet-900 dark:text-violet-200 space-y-1">
                <p className="font-semibold">Security & API Protocol</p>
                <p className="text-violet-700 dark:text-violet-300">
                  Stripe secret keys and webhook signing secrets are never stored in the database or exposed to the client. Add the environment variables below to your server&apos;s <code className="font-mono bg-violet-100 dark:bg-violet-900/60 px-1 py-0.5 rounded">.env</code> file, then click <strong>Verify Stripe Connection</strong> to test authentication.
                </p>
              </div>
            </div>

            {/* Code Snippet Box */}
            <div className="relative rounded-xl bg-zinc-950 border border-zinc-800 p-4 font-mono text-xs text-zinc-100 overflow-x-auto shadow-inner">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800 text-zinc-400 font-sans">
                <span className="flex items-center gap-2 text-xs font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  Required .env Configuration
                </span>
                <button
                  type="button"
                  onClick={handleCopyStripeEnv}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-all text-xs cursor-pointer font-mono"
                >
                  {copiedEnv ? (
                    <>
                      <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Snippet
                    </>
                  )}
                </button>
              </div>
              <pre className="text-emerald-400 whitespace-pre-wrap leading-relaxed">
                {STRIPE_ENV_SNIPPET}
              </pre>
            </div>

            {/* Verification Result Alert */}
            {stripeVerifyResult && (
              <div
                className={`p-4 rounded-xl text-xs font-medium border flex items-start gap-3 transition-all ${
                  stripeVerifyResult.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-300"
                    : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-300"
                }`}
              >
                <div className="mt-0.5 text-base">
                  {stripeVerifyResult.success ? "✅" : "❌"}
                </div>
                <div className="space-y-1 min-w-0">
                  <p className="font-bold text-xs sm:text-sm">{stripeVerifyResult.message}</p>
                  {stripeVerifyResult.details && (
                    <div className="text-[11px] font-mono space-y-0.5 pt-1 opacity-90">
                      <p>Mode: <span className="font-bold">{stripeVerifyResult.details.livemode ? "Live Production" : "Test Environment"}</span></p>
                      {stripeVerifyResult.details.apiVersion && (
                        <p>API Version: <span className="font-bold">{stripeVerifyResult.details.apiVersion}</span></p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
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
