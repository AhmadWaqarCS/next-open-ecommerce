"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import GlobalFilterBar, { CustomFilterConfig } from "@/app/(dashboard)/_components/global-filter-bar";
import { CRUD } from "@/lib/types";
import { EmailCampaignFilterParams } from "@/lib/filters/email-campaign-filters";
import {
  deleteEmailCampaignAction,
  sendCampaignNowAction,
  resendFailedCampaignRecipientsAction,
  triggerScheduledCampaignsCronAction,
} from "@/actions/email-campaign-actions";

export interface SerializedEmailCampaign {
  id: number;
  name: string;
  strategy: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  email_config: { id: number; name: string; purpose: string } | null;
  template: { id: number; name: string } | null;
  created_at: string;
}

interface EmailCampaignTableProps {
  campaigns: SerializedEmailCampaign[];
  filterParams: EmailCampaignFilterParams;
  permissions: CRUD;
  totalCount: number;
}

export default function EmailCampaignTable({
  campaigns,
  filterParams,
  permissions,
  totalCount,
}: EmailCampaignTableProps) {
  const router = useRouter();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSendNow = async (id: number) => {
    if (!confirm("Send this campaign to all valid recipients now?")) return;

    const res = await sendCampaignNowAction(id);
    if (res.success) {
      showToast("Campaign sending started in background.");
      router.refresh();
    } else {
      showToast(res.message || "Failed to start campaign.", "error");
    }
  };

  const handleResendFailed = async (id: number) => {
    if (!confirm("Resend emails strictly to failed recipients?")) return;

    const res = await resendFailedCampaignRecipientsAction(id);
    if (res.success) {
      showToast("Retrying failed recipients in background.");
      router.refresh();
    } else {
      showToast(res.message || "Failed to trigger retry.", "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this draft campaign?")) return;

    const res = await deleteEmailCampaignAction(id);
    if (res.success) {
      showToast("Campaign deleted.");
      router.refresh();
    } else {
      showToast(res.message || "Failed to delete campaign.", "error");
    }
  };

  const customFilters: CustomFilterConfig[] = [
    {
      key: "status",
      label: "Campaign Status",
      type: "select",
      options: [
        { label: "All Statuses", value: "" },
        { label: "Draft", value: "draft" },
        { label: "Scheduled", value: "scheduled" },
        { label: "Sending...", value: "sending" },
        { label: "Completed", value: "completed" },
        { label: "Partially Failed", value: "partially_failed" },
        { label: "Failed", value: "failed" },
      ],
      isPrimary: true,
    },
    {
      key: "strategy",
      label: "Content Strategy",
      type: "select",
      options: [
        { label: "All Strategies", value: "" },
        { label: "Single Broadcast", value: "single" },
        { label: "Custom Per Recipient", value: "per_recipient" },
      ],
      isPrimary: true,
    },
    {
      key: "min_recipients",
      label: "Min Recipients",
      type: "number",
      placeholder: "e.g. 10",
    },
    {
      key: "max_recipients",
      label: "Max Recipients",
      type: "number",
      placeholder: "e.g. 500",
    },
    {
      key: "scheduled_from",
      label: "Scheduled From",
      type: "date",
    },
    {
      key: "scheduled_to",
      label: "Scheduled To",
      type: "date",
    },
    {
      key: "created_from",
      label: "Created From",
      type: "date",
    },
    {
      key: "created_to",
      label: "Created To",
      type: "date",
    },
  ];

  const columns: ColumnDef<SerializedEmailCampaign>[] = [
    {
      header: "Campaign Title",
      render: (item) => {
        const isLocked = item.sent_count > 0;
        return (
          <div>
            <Link
              href={`/dashboard/email-campaigns/${item.id}`}
              className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline text-base"
            >
              {item.name}
            </Link>
            {isLocked && (
              <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                🔒 Locked (Sent History Exists)
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: "Strategy",
      render: (item) => (
        <span className="capitalize text-xs font-semibold px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
          {item.strategy === "per_recipient" ? "Custom Per Recipient" : "Single Broadcast"}
        </span>
      ),
    },
    {
      header: "Status",
      render: (item) => {
        if (item.status === "completed") {
          return (
            <span className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              Completed
            </span>
          );
        }
        if (item.status === "sending") {
          return (
            <span className="px-2.5 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 animate-pulse">
              Sending...
            </span>
          );
        }
        if (item.status === "scheduled") {
          return (
            <span className="px-2.5 py-1 rounded text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
              Scheduled
            </span>
          );
        }
        if (item.status === "draft") {
          return (
            <span className="px-2.5 py-1 rounded text-xs font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              Draft
            </span>
          );
        }
        if (item.status === "partially_failed") {
          return (
            <span className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              Partially Failed
            </span>
          );
        }
        return (
          <span className="px-2.5 py-1 rounded text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            Failed
          </span>
        );
      },
    },
    {
      header: "Recipients",
      render: (item) => (
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
          {item.total_recipients}
        </span>
      ),
    },
    {
      header: "Sent / Failed",
      render: (item) => (
        <div>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
            {item.sent_count}
          </span>{" "}
          /{" "}
          <span className="text-rose-600 dark:text-rose-400 font-bold">
            {item.failed_count}
          </span>
        </div>
      ),
    },
    {
      header: "Scheduled / Sent At",
      render: (item) => (
        <div className="text-xs text-zinc-500">
          {item.scheduled_at
            ? `Scheduled: ${new Date(item.scheduled_at).toLocaleString()}`
            : item.sent_at
            ? `Sent: ${new Date(item.sent_at).toLocaleString()}`
            : "Not scheduled"}
        </div>
      ),
    },
  ];

  const handleTriggerCron = async () => {
    const res = await triggerScheduledCampaignsCronAction();
    if (res.success) {
      showToast(res.message || "Scheduled campaigns processed successfully.");
      router.refresh();
    } else {
      showToast(res.message || "Failed to trigger scheduled campaigns.", "error");
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-xl text-sm font-medium transition-all ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      <DataTable
        title="Email Campaigns"
        description="Create, schedule, and execute targeted email marketing campaigns"
        permissions={permissions}
        data={campaigns}
        totalCount={totalCount}
        columns={columns}
        createButton={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTriggerCron}
              className="px-3.5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition"
              title="Process all due scheduled campaigns immediately"
            >
              ⚡ Run Scheduled Cron Now
            </button>
            {permissions.create && (
              <Link
                href="/dashboard/email-campaigns/new"
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition"
              >
                + Create Campaign
              </Link>
            )}
          </div>
        }
        filterBar={
          <GlobalFilterBar
            searchKey="name"
            searchPlaceholder="Search email campaigns by title or subject..."
            currentFilters={filterParams as Record<string, string | undefined>}
            customFilters={customFilters}
          />
        }
        renderActions={(item) => {
          const isLocked = item.sent_count > 0;
          return (
            <div className="flex items-center justify-end gap-2">
              <Link
                href={`/dashboard/email-campaigns/${item.id}`}
                className="px-2.5 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded font-semibold hover:bg-zinc-200 transition"
              >
                Manage
              </Link>

              {item.status !== "sending" && item.total_recipients > 0 && permissions.update && (
                <button
                  onClick={() => handleSendNow(item.id)}
                  className="px-2.5 py-1 text-xs bg-indigo-600 text-white font-semibold rounded hover:bg-indigo-700 transition"
                >
                  Send Now
                </button>
              )}

              {item.failed_count > 0 && permissions.update && (
                <button
                  onClick={() => handleResendFailed(item.id)}
                  className="px-2.5 py-1 text-xs bg-amber-600 text-white font-semibold rounded hover:bg-amber-700 transition"
                >
                  Retry Failed
                </button>
              )}

              {!isLocked && permissions.delete && (
                <button
                  onClick={() => handleDelete(item.id)}
                  className="px-2.5 py-1 text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold"
                >
                  Delete
                </button>
              )}
            </div>
          );
        }}
        emptyState={{
          title: "No Email Campaigns Found",
          description: "No email campaigns match your filter parameters.",
        }}
      />
    </div>
  );
}
