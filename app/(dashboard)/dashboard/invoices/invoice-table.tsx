"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CRUD } from "@/lib/types";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import ActivityCell from "@/app/(dashboard)/_components/activity-cell";
import GlobalFilterBar, { CustomFilterConfig } from "@/app/(dashboard)/_components/global-filter-bar";
import Modal from "@/app/(dashboard)/_components/modal";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import {
  deleteInvoice,
  bulkDeleteInvoices,
  generateAndSendInvoiceAction,
} from "@/actions/invoice-actions";

interface Invoice {
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
  invoices: Invoice[];
  filterParams?: Record<string, any>;
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
}

export default function InvoiceTable({
  invoices,
  filterParams = {},
  permissions,
  userNames,
  totalCount,
}: InvoiceTableProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedSendEmailInvoice, setSelectedSendEmailInvoice] = useState<Invoice | null>(null);
  const [selectedDeleteInvoice, setSelectedDeleteInvoice] = useState<Invoice | null>(null);
  const { toast } = useToast();

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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30 uppercase">
            Paid
          </span>
        );
      case "issued":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30 uppercase">
            Issued
          </span>
        );
      case "draft":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30 uppercase">
            Draft
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30 uppercase">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 uppercase">
            {status}
          </span>
        );
    }
  };

  const handleConfirmSendEmail = () => {
    if (!selectedSendEmailInvoice) return;
    const inv = selectedSendEmailInvoice;
    startTransition(async () => {
      const res = await generateAndSendInvoiceAction(inv.order_id);
      setSelectedSendEmailInvoice(null);
      if (res.success) {
        toast(res.message || "Invoice email dispatched successfully.", "success");
      } else {
        toast(res.message || "Failed to send invoice email.", "error");
      }
    });
  };

  const handleConfirmDeleteInvoice = () => {
    if (!selectedDeleteInvoice) return;
    const inv = selectedDeleteInvoice;
    startTransition(async () => {
      const res = await deleteInvoice(inv.id);
      setSelectedDeleteInvoice(null);
      if (res.success) {
        toast(res.message || "Invoice moved to trash.", "success");
      } else {
        toast(res.message || "Failed to delete invoice.", "error");
      }
    });
  };

  const columns: ColumnDef<Invoice>[] = [
    {
      header: "Invoice #",
      render: (item) => (
        <div className="space-y-0.5">
          <Link
            href={`/dashboard/invoices/${item.id}`}
            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 text-sm"
          >
            {item.invoice_number}
          </Link>
          <span className="text-xs text-zinc-500 block">
            Order #{item.order_number || item.order_id}
          </span>
        </div>
      ),
    },
    {
      header: "Customer",
      render: (item) => (
        <div>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100 block text-sm">
            {item.customer_name}
          </span>
          <span className="text-xs text-zinc-500 block">{item.customer_email}</span>
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
        <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
          {formatCurrency(item.total, item.currency)}
        </span>
      ),
    },
    {
      header: "Issued Date",
      render: (item) => (
        <span className="text-xs text-zinc-600 dark:text-zinc-400">
          {formatDate(item.issued_at)}
        </span>
      ),
    },
  ];

  const filterConfigs: CustomFilterConfig[] = [
    { key: "invoice_number", label: "Invoice #", type: "text" },
    { key: "customer_email", label: "Customer Email", type: "text" },
    { key: "customer_name", label: "Customer Name", type: "text" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Issued", value: "issued" },
        { label: "Paid", value: "paid" },
        { label: "Draft", value: "draft" },
        { label: "Cancelled", value: "cancelled" },
      ],
    },
  ];

  return (
    <>
      <DataTable
        title="Invoices"
        description="Manage customer order invoices and track billing status"
        viewTrashHref="/dashboard/invoices/trash"
        filterBar={<GlobalFilterBar customFilters={filterConfigs} />}
        permissions={permissions}
        data={invoices}
        totalCount={totalCount}
        columns={columns}
        renderActivity={(item) => (
          <ActivityCell
            createdAt={item.created_at}
            createdBy={item.created_by}
            updatedAt={item.updated_at}
            updatedBy={item.updated_by}
            userNames={userNames}
          />
        )}
        createButton={
          permissions.create ? (
            <Link
              href="/dashboard/invoices/create"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl transition-colors shadow-sm"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create Invoice
            </Link>
          ) : null
        }
        renderActions={(item) => (
          <div className="flex items-center justify-end gap-2">
            <Link
              href={`/dashboard/invoices/${item.id}`}
              className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded transition-colors"
            >
              View / Print
            </Link>

            {permissions.update && (
              <Link
                href={`/dashboard/invoices/${item.id}/edit`}
                className="px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded transition-colors"
              >
                Edit
              </Link>
            )}

            <button
              onClick={() => setSelectedSendEmailInvoice(item)}
              disabled={isPending}
              className="px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded transition-colors disabled:opacity-50 cursor-pointer"
              title="Send Invoice Email"
            >
              Send Email
            </button>

            {permissions.delete && (
              <button
                onClick={() => setSelectedDeleteInvoice(item)}
                className="px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded transition-colors cursor-pointer"
              >
                Trash
              </button>
            )}
          </div>
        )}
        onBulkDelete={async (selectedIds, selectAllScope) => {
          const res = await bulkDeleteInvoices(selectedIds, selectAllScope);
          if (res.success) {
            toast(res.message || "Selected invoices moved to trash.", "success");
          } else {
            toast(res.message || "Failed to delete selected invoices.", "error");
          }
          return { success: res.success, message: res.message };
        }}
        emptyState={{
          title: "No Invoices Found",
          description: "No order invoices match your search criteria.",
        }}
      />

      {/* Send Email Modal */}
      <Modal
        isOpen={!!selectedSendEmailInvoice}
        onClose={() => setSelectedSendEmailInvoice(null)}
      >
        <div className="mb-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Send Invoice Email
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Dispatch billing details and PDF invoice to the customer.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Send invoice{" "}
            <span className="font-bold text-zinc-800 dark:text-zinc-100">
              {selectedSendEmailInvoice?.invoice_number}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {selectedSendEmailInvoice?.customer_email}
            </span>
            ?
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setSelectedSendEmailInvoice(null)}
              className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSendEmail}
              disabled={isPending}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isPending ? "Sending..." : "Yes, Send Email"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Trash Invoice Modal */}
      <Modal
        isOpen={!!selectedDeleteInvoice}
        onClose={() => setSelectedDeleteInvoice(null)}
      >
        <div className="mb-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Trash Invoice
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Move this invoice to the trash bin.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Are you sure you want to move invoice &quot;
            <span className="font-bold text-zinc-800 dark:text-zinc-100">
              {selectedDeleteInvoice?.invoice_number}
            </span>
            &quot; to trash?
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setSelectedDeleteInvoice(null)}
              className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDeleteInvoice}
              disabled={isPending}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isPending ? "Trashing..." : "Yes, Move to Trash"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
