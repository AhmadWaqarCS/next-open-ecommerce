"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { PublicOrder } from "@/lib/storefront";
import {
  requestOrderCancellationOtpAction,
  confirmOrderCancellationWithOtpAction,
} from "@/actions/order-cancellation-actions";

interface OrderPageClientProps {
  order: PublicOrder;
  currencySymbol: string;
  storeName: string;
  isNewlyPlaced: boolean;
  autoOpenCancel: boolean;
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
      return { label: "Payment on delivery", color: "text-amber-600 bg-amber-50 border-amber-200" };
    case "paid":
      return { label: "Paid", color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
    case "cancelled":
      return { label: "Cancelled", color: "text-red-600 bg-red-50 border-red-200" };
    default:
      return { label: status, color: "text-zinc-600 bg-zinc-100 border-zinc-200" };
  }
}

export default function OrderPageClient({
  order: initialOrder,
  currencySymbol,
  storeName,
  isNewlyPlaced,
  autoOpenCancel,
}: OrderPageClientProps) {
  const [order, setOrder] = useState<PublicOrder>(initialOrder);

  // Cancellation State Machine
  const [showCancelSection, setShowCancelSection] = useState(autoOpenCancel);
  const [cancelStep, setCancelStep] = useState<"request" | "verify" | "success">("request");
  const [cancelEmail, setCancelEmail] = useState(order.customer_email);
  const [otpCode, setOtpCode] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  // Resend OTP Cooldown Timer
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const isCancelled = Boolean(order.cancelled_at || order.fulfillment_status === "cancelled");
  const isFulfilledOrShipped = ["shipped", "delivered"].includes(order.fulfillment_status);
  const isEligibleForCancellation = !isCancelled && !isFulfilledOrShipped;

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelEmail.trim()) {
      setCancelError("Email address is required.");
      return;
    }
    setIsSubmitting(true);
    setCancelError(null);
    setCancelMessage(null);

    const res = await requestOrderCancellationOtpAction({
      order_number: order.order_number,
      email: cancelEmail.trim(),
    });

    setIsSubmitting(false);

    if (res.success) {
      setCancelStep("verify");
      setCancelMessage(res.message || "A 6-digit verification code was sent to your email.");
      setResendCooldown(60);
    } else {
      setCancelError(res.message || "Failed to send verification code.");
    }
  };

  // Step 2: Confirm OTP & Cancel
  const handleConfirmCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim().length !== 6) {
      setCancelError("Please enter a valid 6-digit verification code.");
      return;
    }
    setIsSubmitting(true);
    setCancelError(null);

    const res = await confirmOrderCancellationWithOtpAction({
      order_number: order.order_number,
      email: cancelEmail.trim(),
      otp_code: otpCode.trim(),
      reason: cancelReason.trim() || undefined,
    });

    setIsSubmitting(false);

    if (res.success) {
      setCancelStep("success");
      setOrder((prev) => ({
        ...prev,
        fulfillment_status: "cancelled",
        cancelled_at: new Date(),
        payment_status: "cancelled",
        invoice: prev.invoice ? { ...prev.invoice, status: "cancelled" } : null,
      }));
    } else {
      setCancelError(res.message || "Invalid verification code.");
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setIsSubmitting(true);
    setCancelError(null);

    const res = await requestOrderCancellationOtpAction({
      order_number: order.order_number,
      email: cancelEmail.trim(),
    });

    setIsSubmitting(false);

    if (res.success) {
      setCancelMessage("A fresh verification code has been sent to your email.");
      setResendCooldown(60);
    } else {
      setCancelError(res.message || "Failed to resend verification code.");
    }
  };

  // Printable Invoice Helper
  const handlePrintInvoice = () => {
    window.print();
  };

  const paymentStatus = formatPaymentStatus(order.payment_status);

  // Status timeline mapping
  const timelineSteps = [
    { key: "placed", label: "Order Placed", done: true, date: order.placed_at },
    { key: "processing", label: "Processing", done: ["processing", "shipped", "delivered"].includes(order.fulfillment_status) },
    { key: "shipped", label: "Shipped", done: ["shipped", "delivered"].includes(order.fulfillment_status), date: order.shipped_at },
    { key: "delivered", label: "Delivered", done: order.fulfillment_status === "delivered", date: order.delivered_at },
  ];

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 page-enter bg-zinc-50/60">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* ── 1. POST-CHECKOUT SUCCESS HEADER ───────────────────────────────── */}
        {isNewlyPlaced && (
          <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 rounded-3xl p-8 text-white shadow-xl shadow-zinc-900/10 relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
            <div className="relative flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
              <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 flex-shrink-0">
                <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="space-y-1">
                <span className="text-emerald-400 font-semibold text-xs uppercase tracking-widest">Order Confirmed</span>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Thank you, {order.customer_first_name}!</h1>
                <p className="text-zinc-300 text-sm">Your order has been received and is now being processed.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── 2. ORDER TITLE BAR ───────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-zinc-900 tracking-tight font-mono">#{order.order_number}</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${paymentStatus.color}`}>
                {paymentStatus.label}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Placed on {new Date(order.placed_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {order.invoice && (
              <button
                onClick={handlePrintInvoice}
                className="w-full sm:w-auto px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-2 border border-zinc-200"
              >
                <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print Invoice</span>
              </button>
            )}

            {isEligibleForCancellation && !showCancelSection && (
              <button
                onClick={() => setShowCancelSection(true)}
                className="w-full sm:w-auto px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-medium text-xs rounded-xl transition-all border border-red-200/80 flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Cancel Order</span>
              </button>
            )}
          </div>
        </div>

        {/* ── 3. CANCELLED BADGE / TIMELINE STATUS ──────────────────────────── */}
        {isCancelled ? (
          <div className="bg-red-50/90 border border-red-200 rounded-3xl p-6 text-center space-y-2">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-red-900">This Order Has Been Cancelled</h3>
            <p className="text-xs text-red-700 max-w-md mx-auto">
              {order.cancelled_at
                ? `Cancelled on ${new Date(order.cancelled_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}.`
                : "This order is cancelled and no longer active."}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/80 shadow-sm space-y-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Order Delivery Status</h3>
            
            {/* Step Progress Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative">
              {timelineSteps.map((step, idx) => (
                <div key={step.key} className="flex flex-col items-center text-center space-y-2 relative z-10">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm transition-all ${
                      step.done
                        ? "bg-zinc-900 text-white shadow-md shadow-zinc-900/10"
                        : "bg-zinc-100 text-zinc-400 border border-zinc-200"
                    }`}
                  >
                    {step.done ? (
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${step.done ? "text-zinc-900" : "text-zinc-400"}`}>
                      {step.label}
                    </p>
                    {step.date && (
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        {new Date(step.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Carrier & Tracking Link */}
            {order.tracking_number && (
              <div className="mt-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-200/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-zinc-700">Carrier:</span>
                  <span className="text-zinc-900 font-medium">{order.carrier_name || "Express Delivery"}</span>
                  <span className="text-zinc-400">|</span>
                  <span className="font-semibold text-zinc-700">Tracking #:</span>
                  <span className="font-mono text-zinc-900">{order.tracking_number}</span>
                </div>
                {order.tracking_url && (
                  <a
                    href={order.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-lg transition-all"
                  >
                    Track Package ↗
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 4. INLINE ORDER CANCELLATION PIPELINE CARD ────────────────────── */}
        {showCancelSection && isEligibleForCancellation && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-red-200/80 shadow-lg shadow-red-500/5 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-zinc-900">Cancel Order #{order.order_number}</h3>
              </div>
              <button
                onClick={() => setShowCancelSection(false)}
                className="text-zinc-400 hover:text-zinc-600 text-xs font-medium"
              >
                Close
              </button>
            </div>

            {cancelError && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                {cancelError}
              </div>
            )}

            {cancelMessage && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium">
                {cancelMessage}
              </div>
            )}

            {/* Step 1: Email Confirmation -> Request OTP */}
            {cancelStep === "request" && (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <p className="text-xs text-zinc-600 leading-relaxed">
                  To prevent unauthorized cancellations, an authentication code (OTP) will be sent to your order email address:
                </p>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                    Customer Email Address
                  </label>
                  <input
                    type="email"
                    value={cancelEmail}
                    onChange={(e) => setCancelEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                    Cancellation Reason (Optional)
                  </label>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Placed order by mistake, changed mind"
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCancelSection(false)}
                    className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-medium rounded-xl transition-all"
                  >
                    Keep Order
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting ? "Sending Code..." : "Send Verification Code"}
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Verification Code Input */}
            {cancelStep === "verify" && (
              <form onSubmit={handleConfirmCancellation} className="space-y-4">
                <p className="text-xs text-zinc-600">
                  Please enter the 6-digit verification code sent to <strong>{cancelEmail}</strong>:
                </p>

                <div>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="w-full text-center tracking-[10px] text-2xl font-mono py-3 bg-zinc-50 border-2 border-red-200 rounded-xl font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
                  <span>Didn&apos;t receive the code?</span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || isSubmitting}
                    className="text-red-600 hover:underline font-semibold disabled:text-zinc-400"
                  >
                    {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : "Resend Code"}
                  </button>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCancelStep("request")}
                    className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-medium rounded-xl transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || otpCode.length !== 6}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting ? "Cancelling Order..." : "Confirm & Cancel Order"}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Success Confirmation */}
            {cancelStep === "success" && (
              <div className="text-center py-4 space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="text-base font-bold text-zinc-900">Order Cancelled Successfully</h4>
                <p className="text-xs text-zinc-600 max-w-sm mx-auto">
                  A cancellation confirmation email has been sent to <strong>{cancelEmail}</strong>.
                </p>
                <button
                  onClick={() => setShowCancelSection(false)}
                  className="px-5 py-2 bg-zinc-900 text-white text-xs font-semibold rounded-xl"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── 5. DETAILS GRID: ITEMS + SHIPPING & PAYMENT SUMMARY ──────────── */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8">
          
          {/* Left Column: Order Items */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Items Ordered ({order.items.length})</h3>
              
              <div className="divide-y divide-zinc-100">
                {order.items.map((item, index) => (
                  <div key={index} className="py-4 flex items-center gap-4 first:pt-0 last:pb-0">
                    <div className="w-16 h-16 bg-zinc-100 rounded-2xl overflow-hidden relative flex-shrink-0 border border-zinc-200/60">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.product_name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs">
                          No img
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-zinc-900 truncate">{item.product_name}</h4>
                      {item.variant_name && (
                        <p className="text-[11px] text-zinc-500">{item.variant_name}</p>
                      )}
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Qty: {item.quantity} × {currencySymbol}{Number(item.unit_price).toFixed(2)}
                      </p>
                    </div>

                    <div className="text-right font-mono text-xs font-bold text-zinc-900">
                      {currencySymbol}{Number(item.line_total).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Totals & Delivery Address */}
          <div className="space-y-6">
            {/* Totals Summary Card */}
            <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm space-y-3.5 text-xs">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Order Summary</h3>
              
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal:</span>
                <span className="font-mono text-zinc-900">{currencySymbol}{Number(order.subtotal).toFixed(2)}</span>
              </div>

              {Number(order.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount:</span>
                  <span className="font-mono">-{currencySymbol}{Number(order.discount_amount).toFixed(2)}</span>
                </div>
              )}

              {Number(order.tax_amount) > 0 && (
                <div className="flex justify-between text-zinc-600">
                  <span>Tax:</span>
                  <span className="font-mono text-zinc-900">{currencySymbol}{Number(order.tax_amount).toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-zinc-600">
                <span>Shipping ({order.shipping_method_name}):</span>
                <span className="font-mono text-zinc-900">
                  {Number(order.shipping_cost) === 0 ? "Free" : `${currencySymbol}${Number(order.shipping_cost).toFixed(2)}`}
                </span>
              </div>

              <div className="pt-3 border-t border-zinc-100 flex justify-between text-sm font-bold text-zinc-900">
                <span>Total:</span>
                <span className="font-mono">{currencySymbol}{Number(order.total).toFixed(2)}</span>
              </div>
            </div>

            {/* Delivery Address & Customer Info */}
            <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm space-y-4 text-xs">
              <div>
                <h4 className="font-semibold uppercase tracking-wider text-[11px] text-zinc-400 mb-1">Shipping Address</h4>
                <p className="font-bold text-zinc-900">{order.customer_first_name} {order.customer_last_name}</p>
                <p className="text-zinc-600 mt-0.5">{order.shipping_address_line1}</p>
                {order.shipping_address_line2 && <p className="text-zinc-600">{order.shipping_address_line2}</p>}
                <p className="text-zinc-600">
                  {order.shipping_city}{order.shipping_state ? `, ${order.shipping_state}` : ""} {order.shipping_postal_code}
                </p>
                <p className="text-zinc-600">{order.shipping_country}</p>
              </div>

              <div className="pt-3 border-t border-zinc-100">
                <h4 className="font-semibold uppercase tracking-wider text-[11px] text-zinc-400 mb-1">Contact & Payment</h4>
                <p className="text-zinc-700">{order.customer_email}</p>
                {order.customer_phone && <p className="text-zinc-700">{order.customer_phone}</p>}
                <p className="text-zinc-900 font-semibold mt-1">
                  {formatPaymentMethod(order.payment_method, order.payment_method_name)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 6. OFFICIAL PRINTABLE INVOICE CARD ─────────────────────────────── */}
        {order.invoice && (
          <div className="bg-white rounded-3xl p-8 border border-zinc-200/80 shadow-sm space-y-6 print:shadow-none print:border-none print:p-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-zinc-100 pb-6 gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-zinc-900">Official Invoice</h3>
                  <span className="px-2.5 py-0.5 bg-zinc-100 text-zinc-700 text-[11px] font-mono font-bold rounded-md uppercase">
                    {order.invoice.status}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">Ref: {order.invoice.invoice_number}</p>
              </div>

              <div className="text-left sm:text-right text-xs text-zinc-500">
                <p>Issued: {new Date(order.invoice.issued_at).toLocaleDateString()}</p>
                {order.invoice.paid_at && <p className="text-emerald-600 font-medium">Paid: {new Date(order.invoice.paid_at).toLocaleDateString()}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">Merchant</span>
                <p className="font-bold text-zinc-900 mt-0.5">{storeName}</p>
              </div>
              <div className="text-right">
                <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">Billed To</span>
                <p className="font-bold text-zinc-900 mt-0.5">{order.customer_first_name} {order.customer_last_name}</p>
                <p className="text-zinc-600">{order.customer_email}</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
