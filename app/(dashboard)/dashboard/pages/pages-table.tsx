"use client";

import Link from "next/link";
import {
  toggleSitePageStatus,
  deleteSitePage,
  bulkDeleteSitePages,
  bulkToggleSitePages,
} from "@/actions/page-actions";
import ActivityCell from "@/app/(dashboard)/_components/activity-cell";
import DataTable, { ColumnDef } from "@/app/(dashboard)/_components/data-table";
import GlobalFilterBar from "@/app/(dashboard)/_components/global-filter-bar";
import Modal from "@/app/(dashboard)/_components/modal";
import { useToast } from "@/app/(dashboard)/_components/toast-context";
import { CRUD, site_page, PROTECTED_SYSTEM_SLUGS } from "@/lib/types";
import { PageFilterParams } from "@/lib/filters/page-filters";
import { useState, useTransition } from "react";

interface PagesTableProps {
  pages: site_page[];
  dashboardUsers?: { id: number; name: string | null; email: string }[];
  permissions: CRUD;
  userNames: Record<number, string>;
  totalCount?: number;
  filterParams?: PageFilterParams;
}

export default function PagesTable({
  pages,
  dashboardUsers = [],
  permissions,
  userNames,
  totalCount,
  filterParams = {},
}: PagesTableProps) {
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [isTransitionPending, startTransition] = useTransition();
  const [selectedDeletePage, setSelectedDeletePage] = useState<site_page | null>(
    null,
  );
  const [isDeletePending, startDeleteTransition] = useTransition();
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
      toast(
        response.message ?? `Page ${newStatus ? "enabled" : "disabled"}`,
        "success",
      );
    });
  };

  const handleDeletePage = (id: number) => {
    startDeleteTransition(async () => {
      const response = await deleteSitePage(id);
      if (!response.success) {
        toast(response.message ?? "Failed to delete page", "error");
        return;
      }
      setSelectedDeletePage(null);
      toast(response.message ?? "Page deleted successfully", "success");
    });
  };

  const handleBulkToggle = (
    selectedIds: number[],
    is_active: boolean,
    selectAllScope: boolean,
    clearSelection: () => void,
  ) => {
    startTransition(async () => {
      const res = await bulkToggleSitePages(
        selectedIds,
        is_active,
        selectAllScope,
        filterParams,
      );
      if (res.success) {
        toast(
          res.message ??
            `Selected pages ${is_active ? "enabled" : "disabled"}.`,
          "success",
        );
        clearSelection();
      } else {
        toast(res.message ?? "Failed to update selected pages.", "error");
      }
    });
  };

  const columns: ColumnDef<site_page>[] = [
    {
      header: "Page Title",
      className: "max-w-xs sm:max-w-sm",
      render: (page) => (
        <div className="flex flex-col gap-0.5 max-w-xs sm:max-w-sm">
          <div className="flex items-center gap-2">
            {permissions.update ? (
              <Link
                href={`/dashboard/pages/${page.id}`}
                className="font-bold text-zinc-900 dark:text-zinc-50 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline truncate transition-colors cursor-pointer"
              >
                {page.title}
              </Link>
            ) : (
              <span className="font-bold text-zinc-900 dark:text-zinc-50 truncate">
                {page.title}
              </span>
            )}
            {PROTECTED_SYSTEM_SLUGS.includes(page.slug) && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 shrink-0">
                Core System
              </span>
            )}
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal truncate">
            {page.content ? page.content.replace(/<[^>]*>?/gm, "") : "Static / System Template"}
          </span>
        </div>
      ),
    },
    {
      header: "Storefront Route",
      render: (page) => (
        <a
          href={page.slug === "/" ? "/" : `/${page.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-mono transition-colors"
        >
          <span>{page.slug === "/" ? "/" : `/${page.slug}`}</span>
          <svg
            className="w-3 h-3 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
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
                title={
                  page.is_active ? "Click to disable page" : "Click to enable page"
                }
              >
                <span
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    page.is_active
                      ? "bg-violet-600"
                      : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
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
                  {isPending
                    ? "Updating..."
                    : page.is_active
                      ? "Active"
                      : "Disabled"}
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
    {
      header: "Visibility",
      render: (page) => (
        <div className="flex flex-wrap gap-1.5">
          {page.show_in_header && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
              Header
            </span>
          )}
          {page.show_in_footer && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50">
              Footer
            </span>
          )}
          {!page.show_in_header && !page.show_in_footer && (
            <span className="text-xs text-zinc-400 dark:text-zinc-600">—</span>
          )}
        </div>
      ),
    },
    {
      header: "Sort Order",
      render: (page) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
          #{page.sort_order}
        </span>
      ),
    },
  ];

  return (
    <>
      <DataTable
        title="Pages"
        description="Manage static pages, legal documents, and custom storefront content. Configure layout templates, custom CSS, and SEO tags."
        permissions={permissions}
        data={pages}
        totalCount={totalCount}
        columns={columns}
        createButton={
          permissions.create ? (
            <Link
              href="/dashboard/pages/create"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm shadow-indigo-500/25 transition cursor-pointer"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              <span>Add Page</span>
            </Link>
          ) : null
        }
        onBulkDelete={
          permissions.delete
            ? async (selectedIds, selectAllScope) => {
                return await bulkDeleteSitePages(
                  selectedIds,
                  selectAllScope,
                  filterParams,
                );
              }
            : undefined
        }
        renderBulkActions={(selectedIds, selectAllScope, clearSelection) => (
          <div className="flex items-center gap-2">
            {permissions.update && (
              <>
                <button
                  type="button"
                  disabled={isTransitionPending}
                  onClick={() =>
                    handleBulkToggle(
                      selectedIds,
                      true,
                      selectAllScope,
                      clearSelection,
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition cursor-pointer"
                >
                  Enable Selected
                </button>
                <button
                  type="button"
                  disabled={isTransitionPending}
                  onClick={() =>
                    handleBulkToggle(
                      selectedIds,
                      false,
                      selectAllScope,
                      clearSelection,
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition cursor-pointer"
                >
                  Disable Selected
                </button>
              </>
            )}
          </div>
        )}
        renderActivity={(page) => (
          <ActivityCell
            createdAt={page.created_at}
            createdBy={page.created_by}
            updatedAt={page.updated_at}
            updatedBy={page.updated_by}
            userNames={userNames}
          />
        )}
        renderActions={(page) => {
          const isProtected = PROTECTED_SYSTEM_SLUGS.includes(page.slug);
          return (
            <div className="flex items-center justify-end gap-2">
              {permissions.update && (
                <Link
                  href={`/dashboard/pages/${page.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 hover:text-zinc-900 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                  <span>Edit</span>
                </Link>
              )}

              {permissions.delete && !isProtected && (
                <button
                  type="button"
                  onClick={() => setSelectedDeletePage(page)}
                  className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-950/50 transition cursor-pointer"
                  title="Delete Page"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>
          );
        }}
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
              {
                key: "show_in_header",
                label: "In Header Menu",
                type: "select",
                options: [
                  { value: "true", label: "Yes" },
                  { value: "false", label: "No" },
                ],
              },
              {
                key: "show_in_footer",
                label: "In Footer Menu",
                type: "select",
                options: [
                  { value: "true", label: "Yes" },
                  { value: "false", label: "No" },
                ],
              },
            ]}
          />
        }
        emptyState={{
          title: "No Pages Found",
          description:
            "There are no pages matching your filter parameters.",
        }}
      />

      {/* Delete Confirmation Modal */}
      {selectedDeletePage && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedDeletePage(null)}
        >
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Delete Page
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                This action is permanent and cannot be undone.
              </p>
            </div>

            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Are you sure you want to permanently delete the page{" "}
              <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">
                &ldquo;{selectedDeletePage.title}&rdquo;
              </strong>{" "}
              (<code className="font-mono text-xs">/{selectedDeletePage.slug}</code>)?
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setSelectedDeletePage(null)}
                disabled={isDeletePending}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeletePage(selectedDeletePage.id)}
                disabled={isDeletePending}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs disabled:opacity-50 transition cursor-pointer"
              >
                {isDeletePending ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
