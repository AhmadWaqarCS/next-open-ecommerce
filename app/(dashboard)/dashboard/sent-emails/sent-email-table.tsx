"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CRUD } from "@/lib/types";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import Modal from "@/app/(dashboard)/_components/modal";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { resendEmailAction } from "@/actions/sent-email-actions";

export interface SentEmail {
  id: number;
  type: string;
  sender_email: string;
  recipient_email: string;
  recipient_name?: string | null;
  subject: string;
  order_number?: string | null;
  status: string;
  sent_at?: string | null;
  error_message?: string | null;
  invoice_id?: number | null;
  order_id?: number | null;
}

interface SentEmailTableProps {
  emails: SentEmail[];
  permissions: CRUD;
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

export default function SentEmailTable({
  emails,
  permissions,
  totalCount,
  currentPage,
  pageSize,
}: SentEmailTableProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedResendEmail, setSelectedResendEmail] =
    useState<SentEmail | null>(null);
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

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "marketing":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            Marketing
          </span>
        );
      case "newsletter":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            Newsletter
          </span>
        );
      case "order":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-dashboard-accent-subtle text-dashboard-accent-fg border border-dashboard-accent/20">
            Order
          </span>
        );
      case "support":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Support
          </span>
        );
      case "invoice":
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-dashboard-primary/10 text-dashboard-primary border border-dashboard-primary/20">
            Invoice
          </span>
        );
    }
  };

  const handleConfirmResend = () => {
    if (!selectedResendEmail) return;
    const emailToResend = selectedResendEmail;
    startTransition(async () => {
      const res = await resendEmailAction(emailToResend.id);
      setSelectedResendEmail(null);
      if (res.success) {
        toast.success(res.message || "Email resent successfully.");
      } else {
        toast.error(res.message || "Failed to resend email.");
      }
    });
  };

  const columns: ColumnDef<SentEmail>[] = [
    {
      header: "Recipient",
      render: (item) => (
        <div>
          <span className="font-bold text-dashboard-fg block text-sm">
            {item.recipient_name || item.recipient_email}
          </span>
          {item.recipient_name && (
            <span className="text-xs text-dashboard-muted block font-mono">
              {item.recipient_email}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Subject & Type",
      render: (item) => (
        <div className="space-y-1">
          <Link
            href={`/dashboard/sent-emails/${item.id}`}
            className="font-bold text-dashboard-fg hover:text-dashboard-primary transition-colors block text-sm"
          >
            {item.subject}
          </Link>
          <div>{getTypeBadge(item.type)}</div>
        </div>
      ),
    },
    {
      header: "References",
      render: (item) => (
        <div className="space-y-0.5 text-xs">
          {item.order_number && (
            <span className="text-dashboard-muted block font-mono">
              Order #{item.order_number}
            </span>
          )}
          {item.invoice_id ? (
            <Link
              href={`/dashboard/invoices/${item.invoice_id}`}
              className="text-dashboard-primary hover:underline font-mono block font-semibold"
            >
              Invoice #{item.invoice_id}
            </Link>
          ) : null}
          {!item.order_number && !item.invoice_id && (
            <span className="text-dashboard-muted italic">—</span>
          )}
        </div>
      ),
    },
    {
      header: "Sent Time",
      render: (item) => (
        <span className="text-xs text-dashboard-muted font-medium">
          {formatDate(item.sent_at)}
        </span>
      ),
    },
  ];

  return (
    <>
      <DataTable<SentEmail>
        title="Sent Email Logs"
        description="Audit and inspect outbound emails dispatched via Nodemailer"
        permissions={permissions}
        data={emails}
        columns={columns}
        getRowHref={(item) => `/dashboard/sent-emails/${item.id}`}
        filterConfig={{
          searchKey: "search",
          searchPlaceholder: "Search emails by subject, recipient, order...",
          hideAuditFilters: true,
          hideIdFilter: true,
          customFilters: [
            {
              key: "type",
              label: "Type",
              type: "select",
              isPrimary: true,
              options: [
                { label: "All Types", value: "" },
                { label: "Invoice", value: "invoice" },
                { label: "Order", value: "order" },
                { label: "Marketing", value: "marketing" },
                { label: "Newsletter", value: "newsletter" },
                { label: "Support", value: "support" },
              ],
            },
            { key: "recipient_email", label: "Recipient Email", type: "text" },
            { key: "order_number", label: "Order #", type: "text" },
          ],
        }}
        paginationConfig={{
          totalItems: totalCount,
          currentPage,
          pageSize,
          itemName: "sent emails",
        }}
        actionConfig={{
          renderActions: (item) => (
            <div
              className="flex items-center justify-end gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Link
                href={`/dashboard/sent-emails/${item.id}`}
                className="px-2.5 py-1 text-xs font-semibold text-dashboard-fg bg-dashboard-card hover:bg-dashboard-card-hover border border-dashboard-border rounded-lg transition-colors"
              >
                View Body
              </Link>
              <button
                type="button"
                onClick={() => setSelectedResendEmail(item)}
                disabled={isPending}
                className="px-2.5 py-1 text-xs font-semibold text-dashboard-accent-fg bg-dashboard-accent hover:bg-dashboard-accent/80 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                title="Resend this email"
              >
                Resend
              </button>
            </div>
          ),
        }}
        emptyState={{
          title: "No Sent Email Logs Found",
          description: "No outbound email records match your criteria.",
        }}
      />

      {/* Resend Email Confirmation Modal */}
      <Modal
        isOpen={Boolean(selectedResendEmail)}
        onClose={() => setSelectedResendEmail(null)}
      >
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-dashboard-fg">
              Resend Outbound Email
            </h3>
            <p className="text-xs text-dashboard-muted">
              Re-dispatch this email via Nodemailer integration.
            </p>
          </div>

          <p className="text-sm text-dashboard-fg leading-relaxed">
            Resend &ldquo;
            <span className="font-bold text-dashboard-fg">
              {selectedResendEmail?.subject}
            </span>
            &rdquo; to{" "}
            <span className="font-bold text-dashboard-primary font-mono">
              {selectedResendEmail?.recipient_email}
            </span>
            ?
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-dashboard-border">
            <button
              type="button"
              onClick={() => setSelectedResendEmail(null)}
              disabled={isPending}
              className="px-4 py-2 text-sm font-semibold rounded-xl hover:bg-dashboard-card-hover text-dashboard-muted hover:text-dashboard-fg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmResend}
              disabled={isPending}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-fg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isPending ? "Resending..." : "Yes, Resend Email"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
