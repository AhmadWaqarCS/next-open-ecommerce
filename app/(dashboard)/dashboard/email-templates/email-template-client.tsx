"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EMAIL_USE_CASES } from "@/lib/email-template-engine";
import {
  activateEmailTemplateAction,
  softDeleteEmailTemplateAction,
  restoreEmailTemplateAction,
  permanentlyDeleteEmailTemplateAction,
} from "@/actions/email-template-actions";

export interface EmailTemplateItem {
  id: number;
  key: string;
  name: string;
  description?: string | null;
  subject: string;
  body_html: string;
  is_active: boolean;
  is_system?: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at?: Date | string | null;
}

interface EmailTemplateClientProps {
  templates: EmailTemplateItem[];
  userPermissions: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
}

export function EmailTemplateClient({ templates, userPermissions }: EmailTemplateClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedKey, setSelectedKey] = useState<string>("all");
  const [showTrash, setShowTrash] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesTrash = showTrash ? t.deleted_at !== null : t.deleted_at === null;
    const matchesKey = selectedKey === "all" || t.key === selectedKey;
    return matchesTrash && matchesKey;
  });

  const handleActivate = (id: number) => {
    startTransition(async () => {
      const res = await activateEmailTemplateAction(id);
      if (res.success) {
        showToast("success", res.message || "Template activated.");
        router.refresh();
      } else {
        showToast("error", res.message || "Failed to activate template.");
      }
    });
  };

  const handleSoftDelete = (id: number) => {
    if (!confirm("Are you sure you want to move this template to trash?")) return;
    startTransition(async () => {
      const res = await softDeleteEmailTemplateAction(id);
      if (res.success) {
        showToast("success", res.message || "Template moved to trash.");
        router.refresh();
      } else {
        showToast("error", res.message || "Failed to delete template.");
      }
    });
  };

  const handleRestore = (id: number) => {
    startTransition(async () => {
      const res = await restoreEmailTemplateAction(id);
      if (res.success) {
        showToast("success", res.message || "Template restored.");
        router.refresh();
      } else {
        showToast("error", res.message || "Failed to restore template.");
      }
    });
  };

  const handlePermanentDelete = (id: number) => {
    if (!confirm("This will permanently delete this template. Are you absolutely sure?")) return;
    startTransition(async () => {
      const res = await permanentlyDeleteEmailTemplateAction(id);
      if (res.success) {
        showToast("success", res.message || "Template deleted permanently.");
        router.refresh();
      } else {
        showToast("error", res.message || "Failed to delete template.");
      }
    });
  };

  return (
    <div className="w-full space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl font-medium text-sm transition-all animate-bounce ${
            toastMessage.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toastMessage.text}
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Email Templates
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Manage custom HTML email templates, CSS styles, and data tags for all system communications.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowTrash(!showTrash)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              showTrash
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            {showTrash ? "← Back to Active Templates" : "Trash Bin"}
          </button>

          {userPermissions.create && !showTrash && (
            <Link
              href="/dashboard/email-templates/new"
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-xs rounded-xl shadow-sm transition-all"
            >
              + Create Template
            </Link>
          )}
        </div>
      </div>

      {/* Filter Tabs by Use Case */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setSelectedKey("all")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            selectedKey === "all"
              ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm"
              : "bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
          }`}
        >
          All Use Cases ({filteredTemplates.length})
        </button>

        {EMAIL_USE_CASES.map((uc) => {
          const count = templates.filter(
            (t) => (showTrash ? t.deleted_at !== null : t.deleted_at === null) && t.key === uc.key
          ).length;
          return (
            <button
              key={uc.key}
              onClick={() => setSelectedKey(uc.key)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedKey === uc.key
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm"
                  : "bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              }`}
            >
              {uc.name.split(" ")[0]} ({count})
            </button>
          );
        })}
      </div>

      {/* Use Cases Grouped Section */}
      <div className="space-y-8">
        {EMAIL_USE_CASES.filter((uc) => selectedKey === "all" || selectedKey === uc.key).map((useCase) => {
          const ucTemplates = filteredTemplates.filter((t) => t.key === useCase.key);

          return (
            <div
              key={useCase.key}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm"
            >
              <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                      {useCase.name}
                    </h3>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {useCase.key}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {useCase.description}
                  </p>
                </div>

                {userPermissions.create && !showTrash && (
                  <Link
                    href={`/dashboard/email-templates/new?key=${useCase.key}`}
                    className="self-start sm:self-auto px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-lg transition-all"
                  >
                    + Add New Template
                  </Link>
                )}
              </div>

              {ucTemplates.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
                  {showTrash
                    ? "No deleted templates in trash for this use case."
                    : "No custom templates created. The system is currently using the default code template."}
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {ucTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                        template.is_active
                          ? "bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05]"
                          : "hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20"
                      }`}
                    >
                      <div className="space-y-1.5 max-w-2xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                            {template.name}
                          </span>

                          {template.is_system && (
                            <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              🔒 System Template
                            </span>
                          )}
                          {template.is_active ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Active Template
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                              Inactive
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-mono text-zinc-600 dark:text-zinc-400 truncate">
                          Subject: <span className="text-zinc-800 dark:text-zinc-200">{template.subject}</span>
                        </p>

                        <div className="text-[11px] text-zinc-400 dark:text-zinc-500">
                          Updated {new Date(template.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
                        {!showTrash ? (
                          <>
                            {!template.is_active && userPermissions.update && (
                              <button
                                onClick={() => handleActivate(template.id)}
                                disabled={isPending}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-all disabled:opacity-50"
                              >
                                Set as Active
                              </button>
                            )}

                            {userPermissions.update && (
                              <Link
                                href={`/dashboard/email-templates/${template.id}/edit`}
                                className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs rounded-lg transition-all"
                              >
                                Edit
                              </Link>
                            )}

                            {!template.is_system && userPermissions.delete && (
                              <button
                                onClick={() => handleSoftDelete(template.id)}
                                disabled={isPending}
                                className="px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-semibold text-xs rounded-lg transition-all disabled:opacity-50"
                              >
                                Delete
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            {userPermissions.update && (
                              <button
                                onClick={() => handleRestore(template.id)}
                                disabled={isPending}
                                className="px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-xs rounded-lg transition-all disabled:opacity-50"
                              >
                                Restore
                              </button>
                            )}

                            {userPermissions.delete && (
                              <button
                                onClick={() => handlePermanentDelete(template.id)}
                                disabled={isPending}
                                className="px-3 py-1.5 bg-red-600 text-white font-semibold text-xs rounded-lg transition-all disabled:opacity-50"
                              >
                                Delete Permanently
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
