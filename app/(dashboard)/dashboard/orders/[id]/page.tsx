import { Suspense } from "react";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { assertPermission } from "@/lib/guards";
import { serializeOrder } from "@/lib/action-utils";
import { order as OrderType } from "@/lib/types";
import OrderStatusCard from "./order-status-card";
import { getOrderDetailsDataInDB } from "@/services/order-services";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Order #${id} Details`,
    description: `View complete details and status for order #${id}`,
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function OrderDetailPage(props: PageProps) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <OrderDetailPageContent {...props} />
    </Suspense>
  );
}

async function OrderDetailPageContent({ params }: PageProps) {
  const { permissions } = await assertPermission("read", "/dashboard/orders");
  const { id } = await params;

  const numericId = Number(id);
  if (isNaN(numericId) || numericId < 1) {
    notFound();
  }

  const orderRaw = await getOrderDetailsDataInDB(numericId);

  if (!orderRaw) {
    notFound();
  }

  const order: OrderType = serializeOrder(orderRaw);

  const formatCurrency = (amount: any, currency: string = "USD") => {
    const numeric =
      typeof amount === "number" ? amount : parseFloat(String(amount || "0"));
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(isNaN(numeric) ? 0 : numeric);
  };

  const formatDate = (date?: Date | string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-dashboard-accent-subtle text-dashboard-accent-fg border border-dashboard-accent/30 capitalize">
            <span className="w-1.5 h-1.5 rounded-full bg-dashboard-accent" />
            Paid
          </span>
        );
      case "pending":
      case "cod_pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 capitalize">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {status === "cod_pending" ? "COD Pending" : "Pending"}
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-dashboard-danger-subtle text-dashboard-danger border border-dashboard-danger/20 capitalize">
            <span className="w-1.5 h-1.5 rounded-full bg-dashboard-danger" />
            Failed
          </span>
        );
      case "refunded":
      case "partially_refunded":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 capitalize">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            {status.replace("_", " ")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-dashboard-muted-bg text-dashboard-muted border border-dashboard-border capitalize">
            {status}
          </span>
        );
    }
  };

  const getFulfillmentBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-dashboard-accent-subtle text-dashboard-accent-fg border border-dashboard-accent/30 capitalize">
            <span className="w-1.5 h-1.5 rounded-full bg-dashboard-accent" />
            Delivered
          </span>
        );
      case "shipped":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-dashboard-primary/10 text-dashboard-primary border border-dashboard-primary/30 capitalize">
            <span className="w-1.5 h-1.5 rounded-full bg-dashboard-primary" />
            Shipped
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 capitalize">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Processing
          </span>
        );
      case "unfulfilled":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-dashboard-muted-bg text-dashboard-fg border border-dashboard-border capitalize">
            <span className="w-1.5 h-1.5 rounded-full bg-dashboard-muted" />
            Unfulfilled
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-dashboard-danger-subtle text-dashboard-danger border border-dashboard-danger/20 capitalize">
            <span className="w-1.5 h-1.5 rounded-full bg-dashboard-danger" />
            Cancelled
          </span>
        );
      case "returned":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 capitalize">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            Returned
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-dashboard-muted-bg text-dashboard-muted border border-dashboard-border capitalize">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col pb-10">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-dashboard-card p-6 rounded-2xl border border-dashboard-border shadow-xs">
        <div className="space-y-1">
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-dashboard-muted hover:text-dashboard-fg transition-colors mb-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span>Back to Orders</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold font-mono text-dashboard-fg tracking-tight">
              {order.order_number}
            </h1>
            <div className="flex items-center gap-2">
              {getPaymentBadge(order.payment_status)}
              {getFulfillmentBadge(order.fulfillment_status)}
            </div>
          </div>
          <p className="text-xs text-dashboard-muted">
            Placed on{" "}
            <span className="font-semibold text-dashboard-fg">
              {formatDate(order.placed_at)}
            </span>
          </p>
        </div>
      </div>

      {/* Main Top Grid: Items & Summary (Left 7 cols) + Status & Tracking Form (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols) - Items Table & Financial Summary */}
        <div className="lg:col-span-7 space-y-6">
          {/* Purchased Line Items Card */}
          <div className="bg-dashboard-card rounded-2xl border border-dashboard-border p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-base text-dashboard-fg border-b border-dashboard-border pb-3">
              Order Items ({order.items?.length || 0})
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-dashboard-border-subtle text-dashboard-muted font-bold uppercase tracking-wider">
                    <th className="pb-3">Product</th>
                    <th className="pb-3 text-right">Price</th>
                    <th className="pb-3 text-center">Qty</th>
                    <th className="pb-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashboard-border-subtle">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item) => {
                      const optionsMap =
                        item.options && typeof item.options === "object"
                          ? (item.options as Record<string, any>)
                          : null;

                      return (
                        <tr key={item.id} className="group">
                          <td className="py-4 pr-3">
                            <div className="flex items-start gap-3">
                              <div className="relative w-12 h-12 rounded-xl bg-dashboard-muted-bg border border-dashboard-border shrink-0 overflow-hidden flex items-center justify-center">
                                {item.image_url ? (
                                  <Image
                                    src={item.image_url}
                                    alt={item.product_name}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <svg
                                    className="w-6 h-6 text-dashboard-muted"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                )}
                              </div>
                              <div className="space-y-1">
                                <span className="font-bold text-sm text-dashboard-fg block">
                                  {item.product_name}
                                </span>

                                {/* Variant Name */}
                                {item.variant_name && (
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-dashboard-primary">
                                    <svg
                                      className="w-3.5 h-3.5"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={2}
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M7 7h10M7 12h10m-8 5h8"
                                      />
                                    </svg>
                                    Variant: {item.variant_name}
                                  </span>
                                )}

                                {/* Attribute Options Bag (Color, Size, Material, etc.) */}
                                {optionsMap &&
                                  Object.keys(optionsMap).length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                      {Object.entries(optionsMap).map(
                                        ([optKey, optVal]) => (
                                          <span
                                            key={optKey}
                                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-dashboard-muted-bg text-dashboard-fg border border-dashboard-border"
                                          >
                                            <span className="text-dashboard-muted mr-1 capitalize">
                                              {optKey}:
                                            </span>{" "}
                                            {String(optVal)}
                                          </span>
                                        ),
                                      )}
                                    </div>
                                  )}

                                {/* SKU */}
                                {item.sku && (
                                  <span className="text-[11px] font-mono text-dashboard-muted block pt-0.5">
                                    SKU: {item.sku}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-3 text-right font-semibold text-dashboard-fg whitespace-nowrap">
                            {formatCurrency(item.unit_price, order.currency)}
                          </td>
                          <td className="py-4 px-3 text-center font-bold text-dashboard-fg whitespace-nowrap">
                            {item.quantity}
                          </td>
                          <td className="py-4 pl-3 text-right font-extrabold text-dashboard-fg whitespace-nowrap">
                            {formatCurrency(item.line_total, order.currency)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-4 text-center text-dashboard-muted"
                      >
                        No line items associated with this order.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Breakdown Card */}
          <div className="bg-dashboard-card rounded-2xl border border-dashboard-border p-6 shadow-xs space-y-3">
            <h3 className="font-bold text-base text-dashboard-fg border-b border-dashboard-border pb-3">
              Order Financial Summary
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-dashboard-muted font-medium">
                <span>Subtotal</span>
                <span className="text-dashboard-fg font-semibold">
                  {formatCurrency(order.subtotal, order.currency)}
                </span>
              </div>

              {Number(order.discount_amount) > 0 && (
                <div className="flex justify-between text-dashboard-accent-fg font-medium">
                  <span>
                    Discount {order.coupon_code ? `(${order.coupon_code})` : ""}
                  </span>
                  <span>
                    -{formatCurrency(order.discount_amount, order.currency)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-dashboard-muted font-medium">
                <span>
                  Shipping ({order.shipping_method_name || "Standard Shipping"})
                </span>
                <span className="text-dashboard-fg font-semibold">
                  {formatCurrency(order.shipping_cost, order.currency)}
                </span>
              </div>

              <div className="flex justify-between text-dashboard-muted font-medium">
                <span>Estimated Tax</span>
                <span className="text-dashboard-fg font-semibold">
                  {formatCurrency(order.tax_amount, order.currency)}
                </span>
              </div>

              <div className="pt-3 border-t border-dashboard-border flex justify-between items-center text-sm font-bold text-dashboard-fg">
                <span>Total Amount</span>
                <span className="text-base font-extrabold text-dashboard-primary">
                  {formatCurrency(order.total, order.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols) - Order Status Form & Notes */}
        <div className="lg:col-span-5 space-y-6">
          {/* Status & Tracking Card */}
          <OrderStatusCard order={order} canUpdate={permissions.update} />

          {/* Notes & Instructions Card */}
          {(order.customer_notes || order.admin_notes) && (
            <div className="bg-dashboard-card rounded-2xl border border-dashboard-border p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-base text-dashboard-fg border-b border-dashboard-border pb-3">
                Order Notes
              </h3>

              {order.customer_notes && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block">
                    Customer Instructions
                  </span>
                  <p className="text-xs text-dashboard-fg whitespace-pre-wrap">
                    {order.customer_notes}
                  </p>
                </div>
              )}

              {order.admin_notes && (
                <div className="p-3.5 rounded-xl bg-dashboard-primary/10 border border-dashboard-primary/20 space-y-1">
                  <span className="text-xs font-bold text-dashboard-primary block">
                    Internal Dashboard Notes
                  </span>
                  <p className="text-xs text-dashboard-fg whitespace-pre-wrap">
                    {order.admin_notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* External Tracking Link Card if Carrier Available */}
          {(order.carrier_name || order.tracking_number) && (
            <div className="bg-dashboard-card rounded-2xl border border-dashboard-border p-6 shadow-xs space-y-3">
              <h3 className="font-bold text-base text-dashboard-fg border-b border-dashboard-border pb-3">
                Shipment Tracking Details
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-dashboard-muted font-medium">Carrier</span>
                  <span className="font-bold text-dashboard-fg">
                    {order.carrier_name || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dashboard-muted font-medium">Tracking #</span>
                  <span className="font-mono font-bold text-dashboard-fg">
                    {order.tracking_number || "N/A"}
                  </span>
                </div>
                {order.tracking_url && (
                  <div className="pt-2 border-t border-dashboard-border">
                    <a
                      href={order.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-dashboard-primary font-bold hover:underline"
                    >
                      <span>Open External Tracking Link</span>
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid: 4 Equal Cards for Customer Info, Shipping Address, Billing Address & Payment Method */}
      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-bold text-dashboard-fg tracking-tight">
          Customer & Delivery Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Customer Profile */}
          <div className="bg-dashboard-card rounded-2xl border border-dashboard-border p-6 shadow-xs space-y-3 flex flex-col justify-between">
            <h3 className="font-bold text-sm text-dashboard-fg border-b border-dashboard-border pb-3 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-dashboard-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span>Customer Information</span>
            </h3>

            <div className="space-y-2.5 text-xs flex-1">
              <div>
                <span className="text-dashboard-muted font-medium block">
                  Full Name
                </span>
                <span className="font-bold text-dashboard-fg text-sm">
                  {order.customer_first_name} {order.customer_last_name}
                </span>
              </div>
              <div>
                <span className="text-dashboard-muted font-medium block">
                  Email Address
                </span>
                <a
                  href={`mailto:${order.customer_email}`}
                  className="font-mono text-dashboard-primary font-semibold hover:underline break-all"
                >
                  {order.customer_email}
                </a>
              </div>
              {order.customer_phone && (
                <div>
                  <span className="text-dashboard-muted font-medium block">
                    Phone Number
                  </span>
                  <a
                    href={`tel:${order.customer_phone}`}
                    className="font-mono text-dashboard-fg font-semibold hover:underline"
                  >
                    {order.customer_phone}
                  </a>
                </div>
              )}
              {order.customer_ip && (
                <div>
                  <span className="text-dashboard-muted font-medium block">
                    IP Address
                  </span>
                  <span className="font-mono text-dashboard-muted">
                    {order.customer_ip}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Shipping Address */}
          <div className="bg-dashboard-card rounded-2xl border border-dashboard-border p-6 shadow-xs space-y-3 flex flex-col justify-between">
            <h3 className="font-bold text-sm text-dashboard-fg border-b border-dashboard-border pb-3 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-dashboard-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>Shipping Address</span>
            </h3>

            <div className="text-xs text-dashboard-fg space-y-1 font-medium leading-relaxed flex-1">
              <p className="font-bold text-dashboard-fg text-sm">
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
              <p className="font-bold text-dashboard-fg uppercase tracking-wider text-[11px] pt-1">
                {order.shipping_country}
              </p>
            </div>
          </div>

          {/* Card 3: Billing Address */}
          <div className="bg-dashboard-card rounded-2xl border border-dashboard-border p-6 shadow-xs space-y-3 flex flex-col justify-between">
            <h3 className="font-bold text-sm text-dashboard-fg border-b border-dashboard-border pb-3 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-purple-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span>Billing Address</span>
            </h3>

            <div className="text-xs text-dashboard-fg space-y-1 font-medium leading-relaxed flex-1">
              <p className="font-bold text-dashboard-fg text-sm">
                {order.customer_first_name} {order.customer_last_name}
              </p>
              <p>{order.billing_address_line1}</p>
              {order.billing_address_line2 && (
                <p>{order.billing_address_line2}</p>
              )}
              <p>
                {order.billing_city}
                {order.billing_state ? `, ${order.billing_state}` : ""}{" "}
                {order.billing_postal_code}
              </p>
              <p className="font-bold text-dashboard-fg uppercase tracking-wider text-[11px] pt-1">
                {order.billing_country}
              </p>
            </div>
          </div>

          {/* Card 4: Payment Method */}
          <div className="bg-dashboard-card rounded-2xl border border-dashboard-border p-6 shadow-xs space-y-3 flex flex-col justify-between">
            <h3 className="font-bold text-sm text-dashboard-fg border-b border-dashboard-border pb-3 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span>Payment Method</span>
            </h3>

            <div className="space-y-2.5 text-xs flex-1">
              <div>
                <span className="text-dashboard-muted font-medium block">
                  Method Name
                </span>
                <span className="font-bold text-dashboard-fg text-sm">
                  {order.payment_method_name || order.payment_method}
                </span>
              </div>
              <div>
                <span className="text-dashboard-muted font-medium block mb-1">
                  Provider Slug
                </span>
                <span className="font-mono text-xs text-dashboard-muted">
                  {order.payment_method}
                </span>
              </div>
              <div>
                <span className="text-dashboard-muted font-medium block mb-1">
                  Payment Status
                </span>
                {getPaymentBadge(order.payment_status)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
