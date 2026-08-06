"use client";

import { useState } from "react";
import GlobalFilterBar, {
  CustomFilterConfig,
} from "@/app/(dashboard)/_components/global-filter-bar";
import { ActivityLogFilterParams } from "@/lib/filters/activity-log-filters";

export interface SerializedActivityLog {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string | null;
  user_id: number | null;
  user_email: string | null;
  user_role: string | null;
  status: string;
  details: any;
  ip_address: string | null;
  created_at: string;
}

interface ActivityLogTableProps {
  logs: SerializedActivityLog[];
  filterParams: ActivityLogFilterParams;
  totalCount: number;
  distinctEntityTypes: string[];
}

export default function ActivityLogTable({
  logs,
  filterParams,
  totalCount,
  distinctEntityTypes,
}: ActivityLogTableProps) {
  // Modal / Drawer state for viewing details
  const [activeLogModal, setActiveLogModal] = useState<SerializedActivityLog | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyDetails = (details: any) => {
    navigator.clipboard.writeText(JSON.stringify(details, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filterConfigs: CustomFilterConfig[] = [
    {
      key: "user_email",
      label: "User Email",
      type: "text",
      placeholder: "Filter by user email...",
      isPrimary: true,
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      isPrimary: true,
      options: [
        { label: "SUCCESS", value: "SUCCESS" },
        { label: "FAILED", value: "FAILED" },
      ],
    },
    {
      key: "entity_type",
      label: "Entity Type",
      type: "select",
      isPrimary: true,
      options: distinctEntityTypes.map((type) => ({
        label: type,
        value: type,
      })),
    },
    {
      key: "action",
      label: "Action",
      type: "text",
      placeholder: "Filter by action name...",
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

  return (
    <div className="space-y-4">
      {/* Table Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Activity Logs
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Read-only audit log tracking all admin operations and system events ({totalCount} total entries)
          </p>
        </div>
      </div>

      {/* Shared Global Filter Bar */}
      <GlobalFilterBar
        searchKey="search"
        searchPlaceholder="Search user email, action, entity..."
        currentFilters={filterParams as Record<string, string | undefined>}
        customFilters={filterConfigs}
        hideAuditFilters={true}
        hideIdFilter={true}
      />

      {/* Log Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-900 dark:text-zinc-100">
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-zinc-500 dark:text-zinc-400"
                  >
                    No activity logs recorded matching your filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="py-3 px-4 whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(log.created_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "medium",
                      })}
                    </td>
                    <td className="py-3 px-4">
                      {log.user_email ? (
                        <div>
                          <div className="font-medium text-xs text-zinc-900 dark:text-zinc-100">
                            {log.user_email}
                          </div>
                          {log.user_role && (
                            <span className="inline-block px-1.5 py-0.5 mt-0.5 text-[10px] font-semibold tracking-wide uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded">
                              {log.user_role}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400 italic">System / Visitor</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-xs">
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {log.entity_type}
                      </span>
                      {log.entity_id && (
                        <span className="ml-1 text-zinc-400">({log.entity_id})</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {log.status === "SUCCESS" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                          SUCCESS
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                          FAILED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {log.ip_address || "—"}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setActiveLogModal(log)}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded transition-colors"
                      >
                        Inspect Payload
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Payload Detail Inspector Modal */}
      {activeLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <span>Log Details</span>
                  <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900">
                    {activeLogModal.action}
                  </span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Logged on {new Date(activeLogModal.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setActiveLogModal(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4 text-xs bg-zinc-50 dark:bg-zinc-800/30 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div>
                  <span className="text-zinc-400 block font-medium">User Email</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-semibold">
                    {activeLogModal.user_email || "N/A (System)"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block font-medium">User Role</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-semibold">
                    {activeLogModal.user_role || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block font-medium">Entity Type & ID</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-semibold">
                    {activeLogModal.entity_type} {activeLogModal.entity_id ? `(${activeLogModal.entity_id})` : ""}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block font-medium">IP Address</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-mono">
                    {activeLogModal.ip_address || "N/A"}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
                    Context Payload (JSON)
                  </label>
                  <button
                    onClick={() => handleCopyDetails(activeLogModal.details)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    {copied ? "Copied to Clipboard!" : "Copy JSON"}
                  </button>
                </div>
                <pre className="p-4 bg-zinc-950 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto max-h-64 border border-zinc-800 shadow-inner">
                  {JSON.stringify(activeLogModal.details, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end bg-zinc-50 dark:bg-zinc-800/50">
              <button
                onClick={() => setActiveLogModal(null)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-medium rounded-lg"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
