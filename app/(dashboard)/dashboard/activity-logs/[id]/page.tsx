import { notFound } from "next/navigation";
import Link from "next/link";
import { assertPermission } from "@/lib/guards";
import prisma from "@/lib/prisma";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Activity Log Details",
  description: "Detailed view of a single system activity log event",
};

export default async function DashboardActivityLogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await assertPermission("read", "/dashboard/activity-logs");
  const { id } = await params;
  const logId = Number(id);

  if (isNaN(logId) || logId < 1) {
    notFound();
  }

  const log = await prisma.activity_log.findUnique({
    where: { id: logId },
  });

  if (!log) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/activity-logs"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Activity Logs
        </Link>
      </div>

      {/* Header Card */}
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900">
                {log.action}
              </span>
              {log.status === "SUCCESS" ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                  SUCCESS
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                  FAILED
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
              Log Event #{log.id}
            </h1>
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 text-right">
            <div>Logged At</div>
            <div className="font-medium text-zinc-900 dark:text-zinc-100 mt-0.5">
              {new Date(log.created_at).toLocaleString(undefined, {
                dateStyle: "full",
                timeStyle: "medium",
              })}
            </div>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs pt-2">
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <span className="text-zinc-400 block font-medium">User Email</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 block truncate">
              {log.user_email || "System / Anonymous"}
            </span>
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <span className="text-zinc-400 block font-medium">User Role & ID</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 block">
              {log.user_role || "N/A"} {log.user_id ? `(#${log.user_id})` : ""}
            </span>
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <span className="text-zinc-400 block font-medium">Entity Type & ID</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 block truncate">
              {log.entity_type} {log.entity_id ? `(${log.entity_id})` : ""}
            </span>
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <span className="text-zinc-400 block font-medium">IP Address</span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 block">
              {log.ip_address || "—"}
            </span>
          </div>
        </div>
      </div>

      {/* JSON Payload Inspection Card */}
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Context Payload (Details JSON)
        </h2>
        <pre className="p-4 bg-zinc-950 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto max-h-96 border border-zinc-800 shadow-inner">
          {JSON.stringify(log.details, null, 2)}
        </pre>
      </div>
    </div>
  );
}
