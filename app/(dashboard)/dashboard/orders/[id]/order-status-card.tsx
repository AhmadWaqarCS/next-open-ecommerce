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

export default function OrderStatusCard({
  order,
  canUpdate,
}: OrderStatusCardProps) {
  const [isPending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const { toast } = useToast();

  const isCancelled = Boolean(
    order.cancelled_at || order.fulfillment_status === "cancelled",
  );

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
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
      try {
        const response = await updateOrder(order.id, data);
        if (!response.success) {
          if (response.errors) {
            setFormErrors(response.errors, setError);
          }
          if (response.message) {
            setGlobalError(response.message);
          }
          toast.error(response.message || "Failed to update order status");
          return;
        }

        toast.action(response, "Order updated successfully.");
      } catch (err: any) {
        setGlobalError("An unexpected network error occurred.");
        toast.error("Could not save status update.");
      }
    });
  };

  return (
    <div className="bg-dashboard-card rounded-2xl border border-dashboard-border p-6 shadow-xs space-y-5">
      {/* Top Header with Action Button at Top-Right (per CLIENT-SIDE-FORMS.md) */}
      <div className="flex items-center justify-between border-b border-dashboard-border pb-4 gap-4">
        <div>
          <h3 className="font-bold text-base text-dashboard-fg">
            Order Status & Fulfillment
          </h3>
          <p className="text-xs text-dashboard-muted">
            Update fulfillment workflow, payment state, and shipment tracking.
          </p>
        </div>

        {canUpdate && !isCancelled && (
          <button
            type="submit"
            form="order-status-form"
            disabled={isPending}
            className="shrink-0 py-2 px-4 rounded-xl bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-fg font-semibold text-xs transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-xs"
          >
            {isPending ? (
              <>
                <svg
                  className="animate-spin h-3.5 w-3.5 text-dashboard-primary-fg"
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
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Status</span>
            )}
          </button>
        )}
      </div>

      {isCancelled && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2">
          <svg
            className="w-4 h-4 shrink-0 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>This order has been cancelled and cannot be edited.</span>
        </div>
      )}

      {globalError && (
        <div className="p-3.5 rounded-xl bg-dashboard-danger-subtle border border-dashboard-danger/20 text-xs font-semibold text-dashboard-danger">
          {globalError}
        </div>
      )}

      <form
        id="order-status-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
      >
        {/* Payment Status */}
        <div>
          <label
            htmlFor="order-payment-status"
            className="block text-xs font-semibold text-dashboard-fg mb-1.5"
          >
            Payment Status
          </label>
          <select
            id="order-payment-status"
            disabled={!canUpdate || isPending || isCancelled}
            {...register("payment_status")}
            className="w-full px-3.5 py-2.5 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-sm font-semibold text-dashboard-fg focus:outline-none focus:border-dashboard-primary disabled:opacity-60 transition-all cursor-pointer disabled:cursor-not-allowed"
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
            <p className="mt-1 text-xs text-dashboard-danger font-medium">
              {errors.payment_status.message}
            </p>
          )}
        </div>

        {/* Fulfillment Status */}
        <div>
          <label
            htmlFor="order-fulfillment-status"
            className="block text-xs font-semibold text-dashboard-fg mb-1.5"
          >
            Fulfillment Status
          </label>
          <select
            id="order-fulfillment-status"
            disabled={!canUpdate || isPending || isCancelled}
            {...register("fulfillment_status")}
            className="w-full px-3.5 py-2.5 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-sm font-semibold text-dashboard-fg focus:outline-none focus:border-dashboard-primary disabled:opacity-60 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <option value="unfulfilled">Unfulfilled</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="returned">Returned</option>
          </select>
          {errors.fulfillment_status && (
            <p className="mt-1 text-xs text-dashboard-danger font-medium">
              {errors.fulfillment_status.message}
            </p>
          )}
        </div>

        {/* Carrier Name */}
        <div>
          <label
            htmlFor="order-carrier-name"
            className="block text-xs font-semibold text-dashboard-fg mb-1.5"
          >
            Carrier Name
          </label>
          <input
            id="order-carrier-name"
            type="text"
            placeholder="e.g. DHL, FedEx, UPS"
            disabled={!canUpdate || isPending || isCancelled}
            {...register("carrier_name")}
            className="w-full px-3.5 py-2.5 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-sm font-medium text-dashboard-fg placeholder-dashboard-muted focus:outline-none focus:border-dashboard-primary disabled:opacity-60 transition-all disabled:cursor-not-allowed"
          />
        </div>

        {/* Tracking Number */}
        <div>
          <label
            htmlFor="order-tracking-number"
            className="block text-xs font-semibold text-dashboard-fg mb-1.5"
          >
            Tracking Number
          </label>
          <input
            id="order-tracking-number"
            type="text"
            placeholder="e.g. 1Z999AA10123456784"
            disabled={!canUpdate || isPending || isCancelled}
            {...register("tracking_number")}
            className="w-full px-3.5 py-2.5 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-sm font-mono text-dashboard-fg placeholder-dashboard-muted focus:outline-none focus:border-dashboard-primary disabled:opacity-60 transition-all disabled:cursor-not-allowed"
          />
        </div>

        {/* Tracking URL */}
        <div>
          <label
            htmlFor="order-tracking-url"
            className="block text-xs font-semibold text-dashboard-fg mb-1.5"
          >
            Tracking URL
          </label>
          <input
            id="order-tracking-url"
            type="url"
            placeholder="https://track.carrier.com/..."
            disabled={!canUpdate || isPending || isCancelled}
            {...register("tracking_url")}
            className="w-full px-3.5 py-2.5 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-sm font-medium text-dashboard-fg placeholder-dashboard-muted focus:outline-none focus:border-dashboard-primary disabled:opacity-60 transition-all disabled:cursor-not-allowed"
          />
          {errors.tracking_url && (
            <p className="mt-1 text-xs text-dashboard-danger font-medium">
              {errors.tracking_url.message}
            </p>
          )}
        </div>

        {/* Internal Admin Notes */}
        <div>
          <label
            htmlFor="order-admin-notes"
            className="block text-xs font-semibold text-dashboard-fg mb-1.5"
          >
            Internal Admin Notes
          </label>
          <textarea
            id="order-admin-notes"
            rows={3}
            placeholder="Private notes visible only to dashboard managers..."
            disabled={!canUpdate || isPending || isCancelled}
            {...register("admin_notes")}
            className="w-full px-3.5 py-2.5 rounded-xl border border-dashboard-border bg-dashboard-muted-bg text-sm font-medium text-dashboard-fg placeholder-dashboard-muted focus:outline-none focus:border-dashboard-primary disabled:opacity-60 transition-all resize-none disabled:cursor-not-allowed"
          />
        </div>
      </form>
    </div>
  );
}
