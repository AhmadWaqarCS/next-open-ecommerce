"use client";

import { useTransition } from "react";
import Link from "next/link";
import { CRUD } from "@/lib/types";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import {
  bulkUpdateInvoiceStatus,
  generateAndSendInvoiceAction,
} from "@/actions/invoice-actions";

export interface InvoiceItem {
  id: number;
  invoice_number: string;
  order_id: number;
  order_number?: string;
  status: string;
  customer_name: string;
  customer_email: string;
  total: number;
  currency: string;
  issued_at: string;
  paid_at?: string | null;
  created_at: string;
  created_by: number;
  updated_at: string;
  updated_by: number;
}

interface InvoiceTableProps {
  invoices: InvoiceItem[];
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

export default function InvoiceTable({
  invoices,
  permissions,
  userNames,
  totalCount,
  currentPage,
  pageSize,
}: InvoiceTableProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const formatDate = (date?: Date | string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount || 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-dashboard-accent-subtle text-dashboard-accent-fg border border-dashboard-accent/20 uppercase tracking-wider">
            Paid
          </span>
        );
      case "issued":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-dashboard-primary/10 text-dashboard-primary border border-dashboard-primary/20 uppercase tracking-wider">
            Issued
          </span>
        );
      case "draft":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider">
            Draft
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-dashboard-danger-subtle text-dashboard-danger-fg border border-dashboard-danger/20 uppercase tracking-wider">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-dashboard-muted-bg text-dashboard-muted border border-dashboard-border uppercase tracking-wider">
            {status}
          </span>
        );
    }
  };

  const handleSendEmail = (item: InvoiceItem) => {
    startTransition(async () => {
      const res = await generateAndSendInvoiceAction(item.order_id);
      toast.action(
        res,
        `Invoice ${item.invoice_number} sent to customer.`,
        "Failed to send invoice email.",
      );
    });
  };

  const handleBulkStatus = (ids: number[], newStatus: "draft" | "issued" | "paid" | "cancelled") => {
    startTransition(async () => {
      const res = await bulkUpdateInvoiceStatus({ ids, status: newStatus });
      toast.action(res, `Updated ${ids.length} invoices to ${newStatus}.`);
    });
  };

  const columns: ColumnDef<InvoiceItem>[] = [
    {
      header: "Invoice #",
      render: (item) => (
        <div className="space-y-0.5">
          <Link
            href={`/dashboard/invoices/${item.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-bold text-dashboard-primary hover:underline flex items-center gap-1 text-sm"
          >
            {item.invoice_number}
          </Link>
          <span className="text-xs text-dashboard-muted block">
            Order #{item.order_number || item.order_id}
          </span>
        </div>
      ),
    },
    {
      header: "Customer",
      render: (item) => (
        <div>
          <span className="font-semibold text-dashboard-fg block text-sm">
            {item.customer_name}
          </span>
          <span className="text-xs text-dashboard-muted block">{item.customer_email}</span>
        </div>
      ),
    },
    {
      header: "Status",
      render: (item) => getStatusBadge(item.status),
    },
    {
      header: "Total",
      render: (item) => (
        <span className="font-bold text-dashboard-fg text-sm">
          {formatCurrency(item.total, item.currency)}
        </span>
      ),
    },
    {
      header: "Issued Date",
      render: (item) => (
        <span className="text-xs text-dashboard-muted">
          {formatDate(item.issued_at)}
        </span>
      ),
    },
  ];

  return (
    <DataTable<InvoiceItem>
      title="Invoices"
      description="Manage customer order invoices and track billing status."
      permissions={permissions}
      data={invoices}
      columns={columns}
      getRowHref={(item) => `/dashboard/invoices/${item.id}`}
      createButton={
        permissions.create ? (
          <Link
            href="/dashboard/invoices/create"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-dashboard-primary-fg bg-dashboard-primary hover:bg-dashboard-primary-hover rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Invoice</span>
          </Link>
        ) : null
      }
      filterConfig={{
        searchKey: "invoice_number",
        searchPlaceholder: "Search by invoice, order, customer...",
        customFilters: [
          {
            key: "status",
            label: "Status",
            type: "select",
            isPrimary: true,
            options: [
              { label: "All Statuses", value: "all" },
              { label: "Issued", value: "issued" },
              { label: "Paid", value: "paid" },
              { label: "Draft", value: "draft" },
              { label: "Cancelled", value: "cancelled" },
            ],
          },
          { key: "order_number", label: "Order Number", type: "text" },
          { key: "customer_name", label: "Customer Name", type: "text" },
          { key: "customer_email", label: "Customer Email", type: "text" },
          { key: "min_total", label: "Min Total ($)", type: "number" },
          { key: "max_total", label: "Max Total ($)", type: "number" },
          { key: "issued_from", label: "Issued From", type: "date" },
          { key: "issued_to", label: "Issued To", type: "date" },
        ],
      }}
      paginationConfig={{
        totalItems: totalCount,
        pageSize,
        currentPage,
        itemName: "invoices",
      }}
      activityConfig={{ userNames }}
      actionConfig={{
        renderActions: (item) => (
          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <Link
              href={`/dashboard/invoices/${item.id}`}
              className="px-2.5 py-1 text-xs font-semibold text-dashboard-primary bg-dashboard-primary/10 hover:bg-dashboard-primary/20 rounded-lg transition-colors"
            >
              View / Print
            </Link>

            {permissions.update && (
              <Link
                href={`/dashboard/invoices/${item.id}/edit`}
                className="px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors"
              >
                Edit
              </Link>
            )}

            <button
              type="button"
              onClick={() => handleSendEmail(item)}
              disabled={isPending}
              className="px-2.5 py-1 text-xs font-semibold text-dashboard-accent-fg bg-dashboard-accent-subtle hover:bg-dashboard-accent/30 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              title="Send Invoice Email"
            >
              Send Email
            </button>
          </div>
        ),
      }}
      bulkConfig={
        permissions.update
          ? {
              renderBulkActions: (selectedIds) => (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleBulkStatus(selectedIds, "paid")}
                    disabled={isPending}
                    className="px-3 py-1.5 text-xs font-semibold text-dashboard-accent-fg bg-dashboard-accent-subtle hover:bg-dashboard-accent/30 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Mark Paid
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkStatus(selectedIds, "issued")}
                    disabled={isPending}
                    className="px-3 py-1.5 text-xs font-semibold text-dashboard-primary bg-dashboard-primary/10 hover:bg-dashboard-primary/20 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Mark Issued
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkStatus(selectedIds, "cancelled")}
                    disabled={isPending}
                    className="px-3 py-1.5 text-xs font-semibold text-dashboard-danger-fg bg-dashboard-danger-subtle hover:bg-dashboard-danger/30 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Mark Cancelled
                  </button>
                </div>
              ),
            }
          : undefined
      }
      emptyState={{
        title: "No Invoices Found",
        description: "No customer order invoices match your search or filter criteria.",
      }}
    />
  );
}
