import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { getOrderConfirmationPageData } from "@/lib/storefront";

interface OrderConfirmationPageProps {
  params: Promise<{ orderNumber: string }>;
}

export async function generateMetadata({
  params,
}: OrderConfirmationPageProps): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `Order ${orderNumber} Confirmed`,
    robots: { index: false, follow: false },
  };
}

function formatPaymentMethod(method: string, methodName?: string) {
  if (methodName && methodName.trim()) return methodName;
  switch (method) {
    case "cash_on_delivery":
      return "Cash on Delivery";
    case "stripe":
      return "Credit / Debit Card";
    default:
      return method;
  }
}

function formatPaymentStatus(status: string) {
  switch (status) {
    case "cod_pending":
      return {
        label: "Payment on delivery",
        color: "text-amber-600 bg-amber-50",
      };
    case "paid":
      return { label: "Paid", color: "text-emerald-600 bg-emerald-50" };
    case "pending":
      return { label: "Pending", color: "text-zinc-600 bg-zinc-100" };
    default:
      return { label: status, color: "text-zinc-600 bg-zinc-100" };
  }
}

function formatFulfillmentStatus(status: string) {
  switch (status) {
    case "unfulfilled":
      return "We are preparing your order";
    case "processing":
      return "Your order is being processed";
    case "shipped":
      return "Your order has been shipped";
    case "delivered":
      return "Your order has been delivered";
    default:
      return status;
  }
}

async function OrderConfirmationDetails({
  params,
}: OrderConfirmationPageProps) {
  const { orderNumber } = await params;

  const { order } = await getOrderConfirmationPageData(orderNumber);

  if (!order) notFound();

  const currencySymbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$";
  const paymentStatus = formatPaymentStatus(order.payment_status);

  return (
    <div className="page-enter">
      {/* Success banner */}
      <div className="bg-gradient-to-br from-zinc-800 to-zinc-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
          {/* Checkmark */}
          <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-500 rounded-full mb-5 shadow-lg shadow-emerald-500/30">
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Thank you, {order.customer_first_name}!
          </h1>
          <p className="text-white/60 text-sm mt-2">
            Your order has been placed successfully
          </p>
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 mt-4">
            <span className="text-white/60 text-xs">Order</span>
            <span className="text-white text-sm font-bold font-mono tracking-widest">
              {order.order_number}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-8">
          {/* ── Left: Details ──────────────────────────────────────────────── */}
          <div className="flex flex-col gap-6">
            {/* Status card */}
            <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-zinc-900">
                  Order Status
                </h2>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${paymentStatus.color}`}
                >
                  {paymentStatus.label}
                </span>
              </div>
              <p className="text-sm text-zinc-600">
                {formatFulfillmentStatus(order.fulfillment_status)}
              </p>
              {order.payment_method === "cash_on_delivery" && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="text-xs text-amber-700">
                    <span className="font-semibold">Cash on Delivery:</span>{" "}
                    Please have{" "}
                    <span className="font-bold">
                      {currencySymbol}
                      {Number(order.total).toFixed(2)}
                    </span>{" "}
                    ready when your order arrives.
                  </p>
                </div>
              )}
            </div>

            {/* Shipping address */}
            <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-zinc-900 mb-3">
                Shipping To
              </h2>
              <div className="text-sm text-zinc-600 space-y-0.5">
                <p className="font-medium text-zinc-900">
                  {order.customer_first_name} {order.customer_last_name}
                </p>
                <p>{order.shipping_address_line1}</p>
                {order.shipping_address_line2 && (
                  <p>{order.shipping_address_line2}</p>
                )}
                <p>
                  {order.shipping_city}
                  {order.shipping_state ? `, ${order.shipping_state}` : ""}{" "}
                  {order.shipping_postal_code}
                </p>
                <p>{order.shipping_country}</p>
              </div>
            </div>

            {/* Order items */}
            <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-100">
                <h2 className="text-sm font-bold text-zinc-900">
                  Items Ordered ({order.items.length})
                </h2>
              </div>
              <div className="divide-y divide-zinc-50">
                {order.items.map((item, index) => (
                  <div key={index} className="flex gap-4 px-5 py-4">
                    {/* Image */}
                    <div className="relative w-14 h-14 bg-zinc-100 rounded-xl overflow-hidden shrink-0">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.product_name}
                          fill
                          // unoptimized
                          className="object-cover"
                          sizes="56px"
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
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-zinc-900">
                        {item.product_name}
                      </p>
                      {item.variant_name && (
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {item.variant_name}
                        </p>
                      )}
                      <p className="text-xs text-zinc-500 mt-1">
                        Qty: {item.quantity} × {currencySymbol}
                        {Number(item.unit_price).toFixed(2)}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-zinc-900 shrink-0">
                      {currencySymbol}
                      {Number(item.line_total).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: Summary & Payment ─────────────────────────────────── */}
          <div className="flex flex-col gap-6">
            {/* Order summary */}
            <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-zinc-900 mb-4">Summary</h2>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between text-zinc-600">
                  <span>Subtotal</span>
                  <span>
                    {currencySymbol}
                    {Number(order.subtotal).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Shipping</span>
                  <span>
                    {Number(order.shipping_cost) === 0 ? (
                      <span className="text-emerald-600">Free</span>
                    ) : (
                      `${currencySymbol}${Number(order.shipping_cost).toFixed(2)}`
                    )}
                  </span>
                </div>
                {Number(order.discount_amount) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span>
                      −{currencySymbol}
                      {Number(order.discount_amount).toFixed(2)}
                    </span>
                  </div>
                )}
                {Number(order.tax_amount) > 0 && (
                  <div className="flex justify-between text-zinc-600">
                    <span>Tax</span>
                    <span>
                      {currencySymbol}
                      {Number(order.tax_amount).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-zinc-900 pt-2 border-t border-zinc-100 mt-1">
                  <span>Total</span>
                  <span>
                    {currencySymbol}
                    {Number(order.total).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment method */}
            <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-zinc-900 mb-3">Payment</h2>
              <p className="text-sm text-zinc-600">
                {formatPaymentMethod(
                  order.payment_method,
                  order.payment_method_name,
                )}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                via {order.shipping_method_name}
              </p>
            </div>

            {/* Contact info */}
            <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-zinc-900 mb-3">
                Confirmation sent to
              </h2>
              <p className="text-sm text-zinc-600">{order.customer_email}</p>
            </div>

            {/* Notes */}
            {order.customer_notes && (
              <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-bold text-zinc-900 mb-3">
                  Your Notes
                </h2>
                <p className="text-sm text-zinc-600">{order.customer_notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 pt-8 border-t border-zinc-100">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-zinc-900 text-white font-semibold px-6 py-3 rounded-xl hover:bg-zinc-700 active:scale-[0.98] transition-all duration-200 text-sm"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderConfirmationPage({
  params,
}: OrderConfirmationPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <OrderConfirmationDetails params={params} />
    </Suspense>
  );
}
