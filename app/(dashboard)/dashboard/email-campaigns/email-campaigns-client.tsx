"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteEmailCampaignAction,
  sendCampaignNowAction,
  resendFailedCampaignRecipientsAction,
} from "@/actions/email-campaign-actions";

interface Campaign {
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

interface EmailCampaignsClientProps {
  campaigns: Campaign[];
}

export default function EmailCampaignsClient({ campaigns }: EmailCampaignsClientProps) {
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Email Campaigns
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Create, schedule, and execute targeted email marketing campaigns
          </p>
        </div>

        <Link
          href="/dashboard/email-campaigns/new"
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition"
        >
          + Create Campaign
        </Link>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="p-4">Campaign Name</th>
                <th className="p-4">Strategy</th>
                <th className="p-4">Status</th>
                <th className="p-4">Recipients</th>
                <th className="p-4">Sent / Failed</th>
                <th className="p-4">Scheduled / Sent At</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-900 dark:text-zinc-100">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500">
                    No email campaigns created yet. Click "+ Create Campaign" or select recipients from the Customer Directory.
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => {
                  const isLocked = c.sent_count > 0;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="p-4">
                        <Link
                          href={`/dashboard/email-campaigns/${c.id}`}
                          className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {c.name}
                        </Link>
                        {isLocked && (
                          <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                            🔒 Locked (Sent History Exists)
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="capitalize text-xs font-semibold px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800">
                          {c.strategy === "per_recipient"
                            ? "Custom Per Recipient"
                            : "Single Broadcast"}
                        </span>
                      </td>
                      <td className="p-4">
                        {c.status === "completed" && (
                          <span className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Completed
                          </span>
                        )}
                        {c.status === "sending" && (
                          <span className="px-2.5 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 animate-pulse">
                            Sending...
                          </span>
                        )}
                        {c.status === "scheduled" && (
                          <span className="px-2.5 py-1 rounded text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                            Scheduled
                          </span>
                        )}
                        {c.status === "draft" && (
                          <span className="px-2.5 py-1 rounded text-xs font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            Draft
                          </span>
                        )}
                        {c.status === "partially_failed" && (
                          <span className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            Partially Failed
                          </span>
                        )}
                        {c.status === "failed" && (
                          <span className="px-2.5 py-1 rounded text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-semibold">{c.total_recipients}</td>
                      <td className="p-4">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {c.sent_count}
                        </span>{" "}
                        /{" "}
                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                          {c.failed_count}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-zinc-500">
                        {c.scheduled_at
                          ? `Scheduled: ${new Date(c.scheduled_at).toLocaleString()}`
                          : c.sent_at
                          ? `Sent: ${new Date(c.sent_at).toLocaleString()}`
                          : "Not scheduled"}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/email-campaigns/${c.id}`}
                            className="px-2.5 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 rounded font-medium hover:bg-zinc-200 transition"
                          >
                            Manage
                          </Link>

                          {c.status !== "sending" && c.total_recipients > 0 && (
                            <button
                              onClick={() => handleSendNow(c.id)}
                              className="px-2.5 py-1 text-xs bg-indigo-600 text-white font-medium rounded hover:bg-indigo-700 transition"
                            >
                              Send Now
                            </button>
                          )}

                          {c.failed_count > 0 && (
                            <button
                              onClick={() => handleResendFailed(c.id)}
                              className="px-2.5 py-1 text-xs bg-amber-600 text-white font-medium rounded hover:bg-amber-700 transition"
                            >
                              Retry Failed
                            </button>
                          )}

                          {!isLocked && (
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="px-2.5 py-1 text-xs text-rose-600 hover:underline"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
