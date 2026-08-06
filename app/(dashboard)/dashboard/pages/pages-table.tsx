"use client";

import { toggleSitePageStatus } from "@/actions/page-actions";
import ActivityCell from "@/app/(dashboard)/_components/activity-cell";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import GlobalFilterBar from "@/app/(dashboard)/_components/global-filter-bar";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { site_page } from "@/lib/generated/prisma/client";
import { CRUD } from "@/lib/types";
import { PageFilterParams } from "@/lib/filters/page-filters";
import { useState, useTransition } from "react";

interface PagesTableProps {
  pages: site_page[];
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
  filterParams?: PageFilterParams;
}

export default function PagesTable({
  pages,
  permissions,
  userNames,
  totalCount,
  filterParams = {},
}: PagesTableProps) {
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [isTransitionPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleToggleStatus = (id: number, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setPendingId(id);
    startTransition(async () => {
      const response = await toggleSitePageStatus(id, newStatus);
      setPendingId(null);
      if (!response.success) {
        toast(response.message ?? "Failed to update page status", "error");
        return;
      }
      toast(response.message ?? `Page ${newStatus ? "enabled" : "disabled"}`, "success");
    });
  };

  const columns: ColumnDef<site_page>[] = [
    {
      header: "Page Title",
      className: "max-w-xs sm:max-w-sm",
      render: (page) => (
        <div className="flex flex-col gap-0.5 max-w-xs sm:max-w-sm">
          <span className="font-bold text-zinc-900 dark:text-zinc-50 truncate">{page.title}</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal truncate">
            {page.content ? page.content.replace(/<[^>]*>?/gm, "") : ""}
          </span>
        </div>
      ),
    },
    {
      header: "Storefront Slug",
      render: (page) => (
        <a
          href={`/${page.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-mono transition-colors"
        >
          <span>/{page.slug}</span>
          <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      ),
    },
    {
      header: "Status",
      render: (page) => {
        const isPending = pendingId === page.id && isTransitionPending;
        return (
          <div className="flex items-center gap-3">
            {permissions.update ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleToggleStatus(page.id, page.is_active)}
                className="group flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title={page.is_active ? "Click to disable page" : "Click to enable page"}
              >
                <span
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    page.is_active ? "bg-violet-600" : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      page.is_active ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </span>
                <span
                  className={`text-xs font-semibold ${
                    page.is_active
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {isPending ? "Updating..." : page.is_active ? "Active" : "Disabled"}
                </span>
              </button>
            ) : (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  page.is_active
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900/50"
                    : "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    page.is_active ? "bg-emerald-500" : "bg-zinc-400"
                  }`}
                />
                {page.is_active ? "Active" : "Disabled"}
              </span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      title="Pages"
      description="Manage storefront pages. Site pages are pre-configured system records; toggle active status to enable or disable them."
      permissions={permissions}
      data={pages}
      totalCount={totalCount}
      columns={columns}
      renderActivity={(page) => (
        <ActivityCell
          createdAt={page.created_at}
          createdBy={page.created_by}
          updatedAt={page.updated_at}
          updatedBy={page.updated_by}
          userNames={userNames}
        />
      )}
      filterBar={
        <GlobalFilterBar
          searchKey="title"
          searchPlaceholder="Search pages by title or slug..."
          currentFilters={filterParams as Record<string, string | undefined>}
          customFilters={[
            {
              key: "is_active",
              label: "Status",
              isPrimary: true,
              type: "select",
              options: [
                { value: "true", label: "Active" },
                { value: "false", label: "Disabled" },
              ],
            },
          ]}
        />
      }
      emptyState={{
        title: "No Pages Found",
        description: "There are no static pages matching your filter parameters.",
      }}
    />
  );
}

