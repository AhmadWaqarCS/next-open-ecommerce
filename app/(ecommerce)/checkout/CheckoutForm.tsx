"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCart } from "@/lib/cart";
import type {
  CheckoutConfig,
  StorefrontShippingMethod,
  StorefrontPaymentMethod,
} from "@/lib/storefront";
import { checkoutFormSchema, type CheckoutFormInput } from "@/lib/validations";
import { placeOrder } from "@/actions/checkout-action";
import Image from "next/image";
import Link from "next/link";

interface CheckoutFormProps {
  config: CheckoutConfig;
  shippingMethods: StorefrontShippingMethod[];
  paymentMethods: StorefrontPaymentMethod[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function FormField({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

function Input({
  id,
  placeholder,
  type = "text",
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white text-zinc-900 placeholder-zinc-400 outline-none transition-all duration-150 ${
        error
          ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
          : "border-zinc-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
      }`}
      {...props}
    />
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-bold text-zinc-900 pb-3 border-b border-zinc-100 mb-4">
      {children}
    </h2>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CheckoutForm({
  config,
  shippingMethods,
  paymentMethods = [],
}: CheckoutFormProps) {
  const router = useRouter();
  const { state, itemCount, subtotal, clearCart, hydrated } = useCart();
  const { items } = state;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Auto-select first shipping & payment method
  const defaultShipping = shippingMethods[0];
  const defaultPayment = paymentMethods[0];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<CheckoutFormInput>({
    resolver: zodResolver(checkoutFormSchema) as any,
    defaultValues: {
      billing_same_as_shipping: true,
      payment_method_id: defaultPayment?.id,
      payment_method: defaultPayment?.provider ?? "cash_on_delivery",
      payment_method_name: defaultPayment?.name ?? "Cash on Delivery",
      shipping_method_id: defaultShipping?.id,
      shipping_method_name: defaultShipping?.name ?? "",
      shipping_cost: defaultShipping?.price ?? 0,
      items: [],
    },
  });

  // Sync cart items into the form whenever cart changes
  useEffect(() => {
    setValue(
      "items",
      items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId ?? null,
        productName: item.productName,
        variantName: item.variantName ?? null,
        sku: item.sku ?? null,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        imageUrl: item.imageUrl ?? null,
        options: item.options ?? null,
      })),
    );
  }, [items, setValue]);

  // Redirect to home if cart is empty — only after hydration is done and we
  // haven't just placed an order (clearCart fires before router.push completes)
  useEffect(() => {
    if (hydrated && !isSubmitted && itemCount === 0) {
      router.replace("/");
    }
  }, [hydrated, isSubmitted, itemCount, router]);

  const billingSame = watch("billing_same_as_shipping");
  const selectedMethodId = watch("shipping_method_id");
  const selectedMethod =
    shippingMethods.find((m) => m.id === selectedMethodId) ?? defaultShipping;

  const selectedPaymentId = watch("payment_method_id");
  const selectedPaymentProvider = watch("payment_method");
  const selectedPaymentMethod =
    paymentMethods.find((p) => p.id === selectedPaymentId) ??
    paymentMethods.find((p) => p.provider === selectedPaymentProvider) ??
    defaultPayment;

  // Compute effective shipping cost (free if free_over threshold met)
  const effectiveShipping =
    selectedMethod &&
    selectedMethod.free_over !== null &&
    subtotal >= selectedMethod.free_over
      ? 0
      : (selectedMethod?.price ?? 0);

  const paymentCharge = selectedPaymentMethod?.extra_charge ?? 0;

  const total = subtotal + effectiveShipping + paymentCharge;

  const onSubmit: SubmitHandler<CheckoutFormInput> = async (data) => {
    setIsSubmitting(true);
    setServerError(null);

    // Override shipping cost with the computed effective cost
    const dataWithCost: CheckoutFormInput = {
      ...data,
      shipping_cost: effectiveShipping,
    };

    const result = await placeOrder(dataWithCost);

    if (result.success && result.orderNumber) {
      setIsSubmitted(true); // prevent the empty-cart redirect from firing
      clearCart();
      router.push(`/order-confirmation/${result.orderNumber}`);
    } else {
      setServerError(result.message ?? "An error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  // While cart is still being read from localStorage, show nothing
  if (!hydrated) return null;

  if (itemCount === 0) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10"
      >
        {/* ─── Left Column — Form Fields ─────────────────────────────────── */}
        <div className="flex flex-col gap-8">
          {/* ── 1. Customer Info ──────────────────────────────────────────── */}
          <section>
            <SectionTitle>Contact Information</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="First Name"
                required
                error={errors.customer_first_name?.message}
              >
                <Input
                  id="customer_first_name"
                  placeholder="John"
                  error={!!errors.customer_first_name}
                  {...register("customer_first_name")}
                />
              </FormField>
              <FormField
                label="Last Name"
                required
                error={errors.customer_last_name?.message}
              >
                <Input
                  id="customer_last_name"
                  placeholder="Doe"
                  error={!!errors.customer_last_name}
                  {...register("customer_last_name")}
                />
              </FormField>
              <FormField
                label="Email"
                required
                error={errors.customer_email?.message}
              >
                <Input
                  id="customer_email"
                  type="email"
                  placeholder="john@example.com"
                  error={!!errors.customer_email}
                  {...register("customer_email")}
                />
              </FormField>
              {config.require_phone && (
                <FormField
                  label="Phone"
                  required
                  error={errors.customer_phone?.message}
                >
                  <Input
                    id="customer_phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    error={!!errors.customer_phone}
                    {...register("customer_phone")}
                  />
                </FormField>
              )}
              {!config.require_phone && (
                <FormField
                  label="Phone (optional)"
                  error={errors.customer_phone?.message}
                >
                  <Input
                    id="customer_phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    {...register("customer_phone")}
                  />
                </FormField>
              )}
            </div>
          </section>

          {/* ── 2. Shipping Address ──────────────────────────────────────── */}
          <section>
            <SectionTitle>Shipping Address</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <FormField
                  label="Address Line 1"
                  required
                  error={errors.shipping_address_line1?.message}
                >
                  <Input
                    id="shipping_address_line1"
                    placeholder="123 Main Street"
                    error={!!errors.shipping_address_line1}
                    {...register("shipping_address_line1")}
                  />
                </FormField>
              </div>
              <div className="sm:col-span-2">
                <FormField
                  label="Address Line 2 (optional)"
                  error={errors.shipping_address_line2?.message}
                >
                  <Input
                    id="shipping_address_line2"
                    placeholder="Apt, suite, unit, etc."
                    {...register("shipping_address_line2")}
                  />
                </FormField>
              </div>
              <FormField
                label="City"
                required
                error={errors.shipping_city?.message}
              >
                <Input
                  id="shipping_city"
                  placeholder="New York"
                  error={!!errors.shipping_city}
                  {...register("shipping_city")}
                />
              </FormField>
              <FormField
                label="State / Province"
                error={errors.shipping_state?.message}
              >
                <Input
                  id="shipping_state"
                  placeholder="NY"
                  {...register("shipping_state")}
                />
              </FormField>
              <FormField
                label="Postal Code"
                required
                error={errors.shipping_postal_code?.message}
              >
                <Input
                  id="shipping_postal_code"
                  placeholder="10001"
                  error={!!errors.shipping_postal_code}
                  {...register("shipping_postal_code")}
                />
              </FormField>
              <FormField
                label="Country (2-letter code)"
                required
                error={errors.shipping_country?.message}
              >
                <Input
                  id="shipping_country"
                  placeholder="US"
                  maxLength={2}
                  error={!!errors.shipping_country}
                  {...register("shipping_country")}
                />
              </FormField>
            </div>
          </section>

          {/* ── 3. Billing Address ────────────────────────────────────────── */}
          <section>
            <SectionTitle>Billing Address</SectionTitle>
            <label className="flex items-center gap-2.5 cursor-pointer mb-4">
              <input
                id="billing_same_as_shipping"
                type="checkbox"
                className="w-4 h-4 rounded border-zinc-300 accent-zinc-900 cursor-pointer"
                {...register("billing_same_as_shipping")}
              />
              <span className="text-sm text-zinc-700">
                Same as shipping address
              </span>
            </label>

            {!billingSame && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <FormField
                    label="Address Line 1"
                    required
                    error={errors.billing_address_line1?.message}
                  >
                    <Input
                      id="billing_address_line1"
                      placeholder="123 Main Street"
                      error={!!errors.billing_address_line1}
                      {...register("billing_address_line1")}
                    />
                  </FormField>
                </div>
                <div className="sm:col-span-2">
                  <FormField label="Address Line 2 (optional)">
                    <Input
                      id="billing_address_line2"
                      placeholder="Apt, suite, unit, etc."
                      {...register("billing_address_line2")}
                    />
                  </FormField>
                </div>
                <FormField
                  label="City"
                  required
                  error={errors.billing_city?.message}
                >
                  <Input
                    id="billing_city"
                    placeholder="New York"
                    error={!!errors.billing_city}
                    {...register("billing_city")}
                  />
                </FormField>
                <FormField label="State / Province">
                  <Input
                    id="billing_state"
                    placeholder="NY"
                    {...register("billing_state")}
                  />
                </FormField>
                <FormField
                  label="Postal Code"
                  required
                  error={errors.billing_postal_code?.message}
                >
                  <Input
                    id="billing_postal_code"
                    placeholder="10001"
                    error={!!errors.billing_postal_code}
                    {...register("billing_postal_code")}
                  />
                </FormField>
                <FormField
                  label="Country (2-letter code)"
                  required
                  error={errors.billing_country?.message}
                >
                  <Input
                    id="billing_country"
                    placeholder="US"
                    maxLength={2}
                    error={!!errors.billing_country}
                    {...register("billing_country")}
                  />
                </FormField>
              </div>
            )}
          </section>

          {/* ── 4. Shipping Method ────────────────────────────────────────── */}
          {shippingMethods.length > 0 && (
            <section>
              <SectionTitle>Shipping Method</SectionTitle>
              <div className="flex flex-col gap-3">
                {shippingMethods.map((method) => {
                  const isFree =
                    method.free_over !== null && subtotal >= method.free_over;
                  const displayPrice = isFree ? 0 : method.price;
                  const isSelected = selectedMethodId === method.id;

                  return (
                    <label
                      key={method.id}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? "border-zinc-900 bg-zinc-50"
                          : "border-zinc-100 hover:border-zinc-300 bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        value={method.id}
                        checked={isSelected}
                        onChange={() => {
                          setValue("shipping_method_id", method.id);
                          setValue("shipping_method_name", method.name);
                          setValue("shipping_cost", isFree ? 0 : method.price);
                        }}
                        className="mt-0.5 accent-zinc-900"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-zinc-900">
                            {method.name}
                          </span>
                          <span className="text-sm font-bold text-zinc-900">
                            {displayPrice === 0 ? (
                              <span className="text-emerald-600">Free</span>
                            ) : (
                              `${config.currency_symbol}${displayPrice.toFixed(2)}`
                            )}
                          </span>
                        </div>
                        {method.description && (
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {method.description}
                          </p>
                        )}
                        {method.estimated_days_min !== null &&
                          method.estimated_days_max !== null && (
                            <p className="text-xs text-zinc-400 mt-0.5">
                              {method.estimated_days_min ===
                              method.estimated_days_max
                                ? `${method.estimated_days_min} business days`
                                : `${method.estimated_days_min}–${method.estimated_days_max} business days`}
                            </p>
                          )}
                        {method.free_over !== null && !isFree && (
                          <p className="text-xs text-emerald-600 mt-0.5">
                            Free on orders over {config.currency_symbol}
                            {method.free_over.toFixed(2)}
                          </p>
                        )}
                        {isFree && (
                          <p className="text-xs text-emerald-600 mt-0.5 font-medium">
                            ✓ Free shipping applied
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
              {errors.shipping_method_id && (
                <p className="text-xs text-red-500 mt-2">
                  {errors.shipping_method_id.message}
                </p>
              )}
            </section>
          )}

          {/* ── 5. Payment Method ─────────────────────────────────────────── */}
          <section>
            <SectionTitle>Payment Method</SectionTitle>
            <div className="flex flex-col gap-3">
              {paymentMethods.length > 0 ? (
                paymentMethods.map((method) => {
                  const isSelected =
                    selectedPaymentId === method.id ||
                    (!selectedPaymentId &&
                      selectedPaymentProvider === method.provider);
                  const extraCharge = method.extra_charge ?? 0;

                  return (
                    <label
                      key={method.id}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? "border-zinc-900 bg-zinc-50"
                          : "border-zinc-100 hover:border-zinc-300 bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        value={method.provider}
                        checked={isSelected}
                        onChange={() => {
                          setValue("payment_method_id", method.id);
                          setValue("payment_method", method.provider);
                          setValue("payment_method_name", method.name);
                        }}
                        className="mt-0.5 accent-zinc-900"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-zinc-900">
                            {method.name}
                          </span>
                          {extraCharge > 0 && (
                            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                              +{config.currency_symbol}
                              {extraCharge.toFixed(2)} charge
                            </span>
                          )}
                        </div>
                        {method.description && (
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {method.description}
                          </p>
                        )}
                        {isSelected && method.instructions && (
                          <div className="mt-2 p-2.5 rounded-lg bg-zinc-100 text-xs text-zinc-700">
                            {method.instructions}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  No payment methods are currently available. Please contact
                  store support.
                </div>
              )}
            </div>
            {errors.payment_method && (
              <p className="text-xs text-red-500 mt-2">
                {errors.payment_method.message}
              </p>
            )}
          </section>

          {/* ── 6. Order Notes ────────────────────────────────────────────── */}
          {config.allow_order_notes && (
            <section>
              <SectionTitle>Order Notes (optional)</SectionTitle>
              <textarea
                id="customer_notes"
                placeholder="Special instructions, delivery preferences, etc."
                rows={3}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 outline-none transition-all bg-white text-zinc-900 placeholder-zinc-400 resize-none"
                {...register("customer_notes")}
              />
            </section>
          )}
        </div>

        {/* ─── Right Column — Order Summary ──────────────────────────────── */}
        <aside className="lg:sticky lg:top-24 h-fit">
          <div className="rounded-2xl border border-zinc-100 bg-white overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-zinc-100">
              <h2 className="text-base font-bold text-zinc-900">
                Order Summary
              </h2>
            </div>

            {/* Items */}
            <div className="px-5 py-4 flex flex-col gap-3 max-h-72 overflow-y-auto">
              {items.map((item) => (
                <div key={item.key} className="flex gap-3">
                  <div className="relative w-12 h-12 bg-zinc-100 rounded-lg overflow-hidden shrink-0">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productName}
                        fill
                        // unoptimized
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-300">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1}
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                      </div>
                    )}
                    <span className="absolute -top-1 -right-1 bg-zinc-900 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-900 line-clamp-1">
                      {item.productName}
                    </p>
                    {item.variantName && (
                      <p className="text-[10px] text-zinc-400">
                        {item.variantName}
                      </p>
                    )}
                    <p className="text-xs font-bold text-zinc-900 mt-0.5">
                      {config.currency_symbol}
                      {(item.unitPrice * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="px-5 py-4 border-t border-zinc-100 flex flex-col gap-2">
              <div className="flex justify-between text-sm text-zinc-600">
                <span>Subtotal ({itemCount} items)</span>
                <span>
                  {config.currency_symbol}
                  {subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm text-zinc-600">
                <span>Shipping</span>
                <span>
                  {effectiveShipping === 0 ? (
                    <span className="text-emerald-600 font-medium">Free</span>
                  ) : (
                    `${config.currency_symbol}${effectiveShipping.toFixed(2)}`
                  )}
                </span>
              </div>
              {paymentCharge > 0 && (
                <div className="flex justify-between text-sm text-amber-600">
                  <span>Payment Surcharge</span>
                  <span>
                    +{config.currency_symbol}
                    {paymentCharge.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-zinc-900 pt-2 border-t border-zinc-100 mt-1">
                <span>Total</span>
                <span>
                  {config.currency_symbol}
                  {total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Place Order */}
            <div className="px-5 pb-5">
              {serverError && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs text-red-600">{serverError}</p>
                </div>
              )}
              <button
                id="place-order-btn"
                type="submit"
                disabled={isSubmitting}
                className={`w-full font-bold py-3.5 rounded-xl text-sm transition-all duration-200 ${
                  isSubmitting
                    ? "bg-zinc-300 text-zinc-500 cursor-not-allowed"
                    : "bg-zinc-900 text-white hover:bg-zinc-700 active:scale-[0.98]"
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin w-4 h-4"
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Placing Order…
                  </span>
                ) : (
                  `Place Order — ${config.currency_symbol}${total.toFixed(2)}`
                )}
              </button>
              <p className="text-center text-xs text-zinc-400 mt-3">
                By placing your order you agree to our{" "}
                <Link href="/terms" className="underline hover:text-zinc-600">
                  terms of service
                </Link>
                .
              </p>
            </div>
          </div>

          {/* Back to cart */}
          <button
            type="button"
            onClick={() => window.history.back()}
            className="w-full text-center text-xs text-zinc-400 hover:text-zinc-700 transition-colors mt-3"
          >
            ← Back to cart
          </button>
        </aside>
      </form>
    </div>
  );
}
