"use client";

import Link from "next/link";
import { CRUD, order } from "@/lib/types";
import DataTable, {
  ColumnDef,
  CustomFilterConfig,
} from "@/app/(dashboard)/_components/data-table";
import { OrderFilterParams } from "@/lib/filters/order-filters";

interface OrderTableProps {
  orders: order[];
  dashboardUsers?: { id: number; name: string | null; email: string }[];
  paymentMethodOptions?: { label: string; value: string }[];
  filterParams?: OrderFilterParams;
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
}

export default function OrderTable({
  orders,
  dashboardUsers = [],
  paymentMethodOptions = [],
  filterParams = {},
  permissions,
  userNames,
  totalCount = 0,
  currentPage = 1,
  pageSize = 10,
}: OrderTableProps) {
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

  const formatCurrency = (amount: string | number, currency: string = "USD") => {
    const numeric = typeof amount === "number" ? amount : parseFloat(amount || "0");
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(isNaN(numeric) ? 0 : numeric);
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-dashboard-accent-subtle text-dashboard-accent-fg border border-dashboard-accent/30 capitalize">
            Paid
          </span>
        );
      case "pending":
      case "cod_pending":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 capitalize">
            {status === "cod_pending" ? "COD Pending" : "Pending"}
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-dashboard-danger-subtle text-dashboard-danger border border-dashboard-danger/20 capitalize">
            Failed
          </span>
        );
      case "refunded":
      case "partially_refunded":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 capitalize">
            {status.replace("_", " ")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-dashboard-muted-bg text-dashboard-muted border border-dashboard-border capitalize">
            {status}
          </span>
        );
    }
  };

  const getFulfillmentStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-dashboard-accent-subtle text-dashboard-accent-fg border border-dashboard-accent/30 capitalize">
            Delivered
          </span>
        );
      case "shipped":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-dashboard-primary/10 text-dashboard-primary border border-dashboard-primary/30 capitalize">
            Shipped
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 capitalize">
            Processing
          </span>
        );
      case "unfulfilled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-dashboard-muted-bg text-dashboard-fg border border-dashboard-border capitalize">
            Unfulfilled
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-dashboard-danger-subtle text-dashboard-danger border border-dashboard-danger/20 capitalize">
            Cancelled
          </span>
        );
      case "returned":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 capitalize">
            Returned
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-dashboard-muted-bg text-dashboard-muted border border-dashboard-border capitalize">
            {status}
          </span>
        );
    }
  };

  const columns: ColumnDef<order>[] = [
    {
      header: "Order Number",
      render: (o) => (
        <div className="flex items-center gap-3 group/o">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-dashboard-primary/10 border border-dashboard-primary/20 shrink-0 flex items-center justify-center text-dashboard-primary group-hover/o:scale-105 transition-all">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </div>
          <div>
            <span className="font-mono font-bold text-dashboard-fg block group-hover/o:text-dashboard-primary transition-colors text-sm">
              {o.order_number}
            </span>
            <span className="text-xs text-dashboard-muted font-medium block">
              ID: #{o.id}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Customer",
      render: (o) => (
        <div className="flex flex-col">
          <span className="font-bold text-dashboard-fg text-sm">
            {o.customer_first_name} {o.customer_last_name}
          </span>
          <span className="text-xs text-dashboard-muted font-mono">
            {o.customer_email}
          </span>
          {o.customer_phone && (
            <span className="text-[11px] text-dashboard-muted font-mono">
              {o.customer_phone}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Total",
      render: (o) => (
        <div className="flex flex-col">
          <span className="font-extrabold text-dashboard-fg text-sm">
            {formatCurrency(o.total, o.currency)}
          </span>
          {o.items && o.items.length > 0 && (
            <span className="text-[11px] text-dashboard-muted font-medium">
              {o.items.length} {o.items.length === 1 ? "item" : "items"}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Payment",
      render: (o) => (
        <div className="flex flex-col gap-1 items-start">
          {getPaymentStatusBadge(o.payment_status)}
          <span className="text-[11px] text-dashboard-muted font-medium">
            {o.payment_method_name || o.payment_method}
          </span>
        </div>
      ),
    },
    {
      header: "Fulfillment",
      render: (o) => (
        <div className="flex flex-col gap-1 items-start">
          {getFulfillmentStatusBadge(o.fulfillment_status)}
          {o.carrier_name && o.tracking_number && (
            <span className="text-[11px] text-dashboard-muted font-mono">
              {o.carrier_name}: {o.tracking_number}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Placed At",
      render: (o) => (
        <span className="text-xs text-dashboard-muted whitespace-nowrap">
          {formatDate(o.placed_at)}
        </span>
      ),
    },
  ];

  const customFilters: CustomFilterConfig[] = [
    // Primary Filters (Main Bar)
    {
      key: "payment_status",
      label: "Payment Status",
      type: "select",
      isPrimary: true,
      options: [
        { label: "Pending", value: "pending" },
        { label: "COD Pending", value: "cod_pending" },
        { label: "Paid", value: "paid" },
        { label: "Failed", value: "failed" },
        { label: "Refunded", value: "refunded" },
        { label: "Partially Refunded", value: "partially_refunded" },
      ],
    },
    {
      key: "fulfillment_status",
      label: "Fulfillment Status",
      type: "select",
      isPrimary: true,
      options: [
        { label: "Unfulfilled", value: "unfulfilled" },
        { label: "Processing", value: "processing" },
        { label: "Shipped", value: "shipped" },
        { label: "Delivered", value: "delivered" },
        { label: "Cancelled", value: "cancelled" },
        { label: "Returned", value: "returned" },
      ],
    },
    ...(paymentMethodOptions.length > 0
      ? [
          {
            key: "payment_method",
            label: "Payment Method",
            type: "select" as const,
            isPrimary: true,
            options: paymentMethodOptions,
          },
        ]
      : []),
    {
      key: "carrier_name",
      label: "Carrier",
      type: "text",
      isPrimary: true,
      placeholder: "e.g. DHL, FedEx",
    },

    // Advanced Filters
    {
      key: "customer_email",
      label: "Customer Email",
      type: "text",
      placeholder: "Email contains...",
    },
    {
      key: "customer_name",
      label: "Customer Name",
      type: "text",
      placeholder: "First or last name...",
    },
    {
      key: "customer_phone",
      label: "Customer Phone",
      type: "text",
      placeholder: "Phone number...",
    },
    {
      key: "coupon_code",
      label: "Coupon Code",
      type: "text",
      placeholder: "Coupon code...",
    },
    {
      key: "tracking_number",
      label: "Tracking Number",
      type: "text",
      placeholder: "Tracking #...",
    },
    {
      key: "shipping_country",
      label: "Shipping Country",
      type: "text",
      placeholder: "e.g. US, PK, UK...",
    },
    {
      key: "shipping_city",
      label: "Shipping City",
      type: "text",
      placeholder: "City name...",
    },
    {
      key: "has_coupon",
      label: "Coupon Applied",
      type: "select",
      options: [
        { label: "With Coupon", value: "true" },
        { label: "No Coupon", value: "false" },
      ],
    },
    {
      key: "has_tracking",
      label: "Tracking Number",
      type: "select",
      options: [
        { label: "With Tracking #", value: "true" },
        { label: "Without Tracking #", value: "false" },
      ],
    },
    {
      key: "has_notes",
      label: "Order Notes",
      type: "select",
      options: [
        { label: "Has Notes", value: "true" },
        { label: "No Notes", value: "false" },
      ],
    },
    {
      key: "min_total",
      label: "Min Total ($)",
      type: "number",
      placeholder: "e.g. 50",
    },
    {
      key: "max_total",
      label: "Max Total ($)",
      type: "number",
      placeholder: "e.g. 500",
    },
    {
      key: "min_subtotal",
      label: "Min Subtotal ($)",
      type: "number",
      placeholder: "e.g. 40",
    },
    {
      key: "max_subtotal",
      label: "Max Subtotal ($)",
      type: "number",
      placeholder: "e.g. 450",
    },
    {
      key: "placed_from",
      label: "Placed From Date",
      type: "date",
    },
    {
      key: "placed_to",
      label: "Placed To Date",
      type: "date",
    },
    {
      key: "paid_from",
      label: "Paid From Date",
      type: "date",
    },
    {
      key: "paid_to",
      label: "Paid To Date",
      type: "date",
    },
    {
      key: "shipped_from",
      label: "Shipped From Date",
      type: "date",
    },
    {
      key: "shipped_to",
      label: "Shipped To Date",
      type: "date",
    },
    {
      key: "delivered_from",
      label: "Delivered From Date",
      type: "date",
    },
    {
      key: "delivered_to",
      label: "Delivered To Date",
      type: "date",
    },
  ];

  return (
    <DataTable<order>
      title="Customer Orders"
      description="View order details, payment statuses, and fulfillment tracking across all customer transactions."
      permissions={permissions}
      data={orders}
      columns={columns}
      getRowHref={(o) => `/dashboard/orders/${o.id}`}
      filterConfig={{
        searchKey: "order_number",
        searchPlaceholder:
          "Search order #, customer name, email, phone, tracking...",
        users: dashboardUsers,
        currentFilters: filterParams as Record<string, string | undefined>,
        customFilters,
      }}
      paginationConfig={{
        totalItems: totalCount,
        currentPage,
        pageSize,
        itemName: "orders",
      }}
      activityConfig={{
        userNames,
      }}
      actionConfig={{
        renderActions: (o) => (
          <div className="flex items-center justify-end">
            <Link
              href={`/dashboard/orders/${o.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-dashboard-border bg-dashboard-card hover:bg-dashboard-card-hover text-dashboard-fg transition-colors"
            >
              <svg
                className="h-3.5 w-3.5 text-dashboard-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <span>View Details</span>
            </Link>
          </div>
        ),
      }}
      emptyState={{
        title: "No orders found",
        description:
          "No customer orders match your search or filter criteria. Try adjusting or clearing your filters.",
      }}
    />
  );
}
