"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CRUD } from "@/lib/types";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import GlobalFilterBar, {
  CustomFilterConfig,
} from "@/app/(dashboard)/_components/global-filter-bar";
import Modal from "@/app/(dashboard)/_components/modal";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { resendEmailAction } from "@/actions/sent-email-actions";

interface SentEmail {
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
  filterParams?: Record<string, any>;
  permissions: CRUD;
  totalCount?: number;
}

export default function SentEmailTable({
  emails,
  filterParams = {},
  permissions,
  totalCount,
}: SentEmailTableProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedResendEmail, setSelectedResendEmail] = useState<SentEmail | null>(null);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "successful":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30 uppercase">
            Successful
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30 uppercase">
            Failed
          </span>
        );
      case "pending":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30 uppercase">
            Pending
          </span>
        );
    }
  };

  const handleConfirmResend = () => {
    if (!selectedResendEmail) return;
    const email = selectedResendEmail;
    startTransition(async () => {
      const res = await resendEmailAction(email.id);
      setSelectedResendEmail(null);
      if (res.success) {
        toast(res.message || "Email resent successfully.", "success");
      } else {
        toast(res.message || "Failed to resend email.", "error");
      }
    });
  };

  const columns: ColumnDef<SentEmail>[] = [
    {
      header: "Recipient",
      render: (item) => (
        <div>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100 block text-sm">
            {item.recipient_name || item.recipient_email}
          </span>
          {item.recipient_name && (
            <span className="text-xs text-zinc-500 block">
              {item.recipient_email}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Subject & Type",
      render: (item) => (
        <div className="space-y-0.5">
          <Link
            href={`/dashboard/sent-emails/${item.id}`}
            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline block text-sm"
          >
            {item.subject}
          </Link>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 uppercase">
              {item.type}
            </span>
            {item.order_number && (
              <span className="text-xs text-zinc-500 font-mono">
                Order #{item.order_number}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      render: (item) => getStatusBadge(item.status),
    },
    {
      header: "Sent Time",
      render: (item) => (
        <span className="text-xs text-zinc-600 dark:text-zinc-400">
          {formatDate(item.sent_at)}
        </span>
      ),
    },
  ];

  const filterConfigs: CustomFilterConfig[] = [
    { key: "recipient_email", label: "Recipient Email", type: "text" },
    { key: "subject", label: "Subject", type: "text" },
    { key: "order_number", label: "Order #", type: "text" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Successful", value: "successful" },
        { label: "Failed", value: "failed" },
        { label: "Pending", value: "pending" },
      ],
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { label: "Invoice", value: "invoice" },
        { label: "Order Notification", value: "order_notification" },
        { label: "Newsletter", value: "newsletter" },
        { label: "System", value: "system" },
      ],
    },
  ];

  return (
    <>
      <DataTable
        title="Sent Email Logs"
        description="Monitor and audit all outbound email dispatches, status results, and failures"
        filterBar={<GlobalFilterBar customFilters={filterConfigs} hideAuditFilters={true} />}
        permissions={permissions}
        data={emails}
        totalCount={totalCount}
        columns={columns}
        renderActions={(item) => (
          <div className="flex items-center justify-end gap-2">
            <Link
              href={`/dashboard/sent-emails/${item.id}`}
              className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded transition-colors"
            >
              View Body
            </Link>
            <button
              onClick={() => setSelectedResendEmail(item)}
              disabled={isPending}
              className="px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded transition-colors disabled:opacity-50 cursor-pointer"
              title="Resend this email"
            >
              Resend
            </button>
          </div>
        )}
        emptyState={{
          title: "No Sent Email Logs Found",
          description: "No outbound email records match your criteria.",
        }}
      />

      {/* Resend Email Modal */}
      <Modal
        isOpen={!!selectedResendEmail}
        onClose={() => setSelectedResendEmail(null)}
      >
        <div className="mb-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Resend Outbound Email
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Re-dispatch this email via Nodemailer integration.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Resend &quot;
            <span className="font-bold text-zinc-800 dark:text-zinc-100">
              {selectedResendEmail?.subject}
            </span>
            &quot; to{" "}
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {selectedResendEmail?.recipient_email}
            </span>
            ?
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setSelectedResendEmail(null)}
              className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmResend}
              disabled={isPending}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isPending ? "Resending..." : "Yes, Resend Email"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
