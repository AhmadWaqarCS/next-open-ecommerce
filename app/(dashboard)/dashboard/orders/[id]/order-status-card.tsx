"use client";

import { updateOrder } from "@/actions/order-actions";
import { setFormErrors } from "@/lib/client-utils";
import { order } from "@/lib/types";
import { OrderUpdateInput, orderUpdateSchema } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useToast } from "@/app/(dashboard)/_components/toast-context";

interface OrderStatusCardProps {
  order: order;
  canUpdate: boolean;
}

export default function OrderStatusCard({ order, canUpdate }: OrderStatusCardProps) {
  const [isPending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const { toast } = useToast();

  const isCancelled = Boolean(order.cancelled_at || order.fulfillment_status === "cancelled");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<OrderUpdateInput>({
    resolver: zodResolver(orderUpdateSchema),
    defaultValues: {
      payment_status: (order.payment_status as any) || "pending",
      fulfillment_status: (order.fulfillment_status as any) || "unfulfilled",
      carrier_name: order.carrier_name || "",
      tracking_number: order.tracking_number || "",
      tracking_url: order.tracking_url || "",
      admin_notes: order.admin_notes || "",
    },
  });

  const onSubmit = (data: OrderUpdateInput) => {
    if (!canUpdate || isCancelled) return;
    setGlobalError(null);
    startTransition(async () => {
      const response = await updateOrder(order.id, data);
      if (!response.success) {
        if (response.errors) setFormErrors(response.errors, setError);
        if (response.message) setGlobalError(response.message);
        toast(response.message || "Failed to update order status", "error");
        return;
      }
      toast(response.message || "Order updated successfully", "success");
    });
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <div>
          <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-50">
            Order Status & Fulfillment
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Update status workflow and shipment tracking information.
          </p>
        </div>
      </div>

      {isCancelled && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>This order has been cancelled and cannot be edited.</span>
        </div>
      )}

      {globalError && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs font-semibold text-rose-600 dark:text-rose-400">
          {globalError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Payment Status */}
        <div>
          <label
            htmlFor="order-payment-status"
            className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5"
          >
            Payment Status
          </label>
          <select
            id="order-payment-status"
            disabled={!canUpdate || isPending || isCancelled}
            {...register("payment_status")}
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 transition-all cursor-not-allowed disabled:cursor-not-allowed"
          >
            <option value="pending">Pending</option>
            <option value="cod_pending">COD Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
            <option value="partially_refunded">Partially Refunded</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {errors.payment_status && (
            <p className="mt-1 text-xs text-rose-500 font-medium">
              {errors.payment_status.message}
            </p>
          )}
        </div>

        {/* Fulfillment Status */}
        <div>
          <label
            htmlFor="order-fulfillment-status"
            className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5"
          >
            Fulfillment Status
          </label>
          <select
            id="order-fulfillment-status"
            disabled={!canUpdate || isPending || isCancelled}
            {...register("fulfillment_status")}
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 transition-all cursor-not-allowed disabled:cursor-not-allowed"
          >
            <option value="unfulfilled">Unfulfilled</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="returned">Returned</option>
          </select>
          {errors.fulfillment_status && (
            <p className="mt-1 text-xs text-rose-500 font-medium">
              {errors.fulfillment_status.message}
            </p>
          )}
        </div>

        {/* Carrier Name */}
        <div>
          <label
            htmlFor="order-carrier-name"
            className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5"
          >
            Carrier Name
          </label>
          <input
            id="order-carrier-name"
            type="text"
            placeholder="e.g. DHL, FedEx, TCS"
            disabled={!canUpdate || isPending || isCancelled}
            {...register("carrier_name")}
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 transition-all cursor-not-allowed disabled:cursor-not-allowed"
          />
        </div>

        {/* Tracking Number */}
        <div>
          <label
            htmlFor="order-tracking-number"
            className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5"
          >
            Tracking Number
          </label>
          <input
            id="order-tracking-number"
            type="text"
            placeholder="e.g. 1Z999AA10123456784"
            disabled={!canUpdate || isPending || isCancelled}
            {...register("tracking_number")}
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 transition-all cursor-not-allowed disabled:cursor-not-allowed"
          />
        </div>

        {/* Tracking URL */}
        <div>
          <label
            htmlFor="order-tracking-url"
            className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5"
          >
            Tracking URL
          </label>
          <input
            id="order-tracking-url"
            type="url"
            placeholder="https://track.carrier.com/..."
            disabled={!canUpdate || isPending || isCancelled}
            {...register("tracking_url")}
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 transition-all cursor-not-allowed disabled:cursor-not-allowed"
          />
          {errors.tracking_url && (
            <p className="mt-1 text-xs text-rose-500 font-medium">
              {errors.tracking_url.message}
            </p>
          )}
        </div>

        {/* Admin Notes */}
        <div>
          <label
            htmlFor="order-admin-notes"
            className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5"
          >
            Internal Admin Notes
          </label>
          <textarea
            id="order-admin-notes"
            rows={3}
            placeholder="Private notes visible only to dashboard managers..."
            disabled={!canUpdate || isPending || isCancelled}
            {...register("admin_notes")}
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 transition-all resize-none cursor-not-allowed disabled:cursor-not-allowed"
          />
        </div>

        {canUpdate && !isCancelled && (
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md shadow-blue-500/10 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Saving Changes...</span>
              </>
            ) : (
              <span>Save Status Updates</span>
            )}
          </button>
        )}
      </form>
    </div>
  );
}
